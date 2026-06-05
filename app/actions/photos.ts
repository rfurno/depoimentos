'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { projectMutationError } from '@/lib/supabase/errors'
import { getProjectAccess } from '@/lib/projects/queries'
import {
  MAX_PHOTOS_PER_UPLOAD,
  PHOTOS_BUCKET,
} from '@/lib/photos/constants'
import { canDeletePhoto, canUploadPhotos } from '@/lib/photos/permissions'
import { validatePhotoFile } from '@/lib/photos/validate'
import { buildPhotoStoragePath } from '@/lib/storage/paths'
import { isSafePhotoStoragePath } from '@/lib/storage/path-guard'
import { parseUuid } from '@/lib/validation/uuid'

const photoMetaSchema = z.object({
  title: z.string().trim().max(200).optional(),
  caption: z.string().trim().max(500).optional(),
  story: z.string().trim().max(5000).optional(),
})

const uploadMetaSchema = z.array(photoMetaSchema).max(MAX_PHOTOS_PER_UPLOAD)

export type PhotoActionState = {
  error?: string
  uploaded?: number
}

function parseMetadata(raw: FormDataEntryValue | null): z.infer<typeof uploadMetaSchema> {
  if (typeof raw !== 'string' || !raw.trim()) return []
  try {
    const parsed = uploadMetaSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : []
  } catch {
    return []
  }
}

export async function uploadPhotos(
  projectId: string,
  _prev: PhotoActionState,
  formData: FormData
): Promise<PhotoActionState> {
  const id = parseUuid(projectId)
  if (!id) return { error: 'Projeto inválido.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar conectado.' }

  const access = await getProjectAccess(id, user.id)
  if (!access) return { error: 'Projeto não encontrado.' }
  if (!canUploadPhotos(access.role)) {
    return { error: 'Você não tem permissão para enviar fotos neste projeto.' }
  }

  const fileEntries = formData.getAll('files').filter((f): f is File => f instanceof File)
  if (fileEntries.length === 0) {
    return { error: 'Selecione pelo menos uma imagem.' }
  }
  if (fileEntries.length > MAX_PHOTOS_PER_UPLOAD) {
    return { error: `Envie no máximo ${MAX_PHOTOS_PER_UPLOAD} fotos por vez.` }
  }

  const metadata = parseMetadata(formData.get('metadata'))
  const uploadedPaths: string[] = []
  let successCount = 0
  const baseOrder = Date.now()

  for (let i = 0; i < fileEntries.length; i++) {
    const file = fileEntries[i]
    const bytes = Buffer.from(await file.arrayBuffer())
    const validation = validatePhotoFile(file, bytes)
    if (!validation.ok) {
      return { error: 'Arquivo inválido.' }
    }

    const storagePath = buildPhotoStoragePath(id, validation.mime)

    const { error: storageError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .upload(storagePath, bytes, {
        contentType: validation.mime,
        upsert: false,
      })

    if (storageError) {
      await cleanupStoragePaths(supabase, uploadedPaths)
      return {
        error:
          process.env.SUPABASE_SERVICE_ROLE_KEY
            ? 'Falha ao enviar imagem para o armazenamento.'
            : 'Falha no armazenamento. Verifique o bucket "photos" e as políticas no Supabase.',
      }
    }

    uploadedPaths.push(storagePath)
    const meta = metadata[i] ?? {}

    const { error: dbError } = await supabase.from('photos').insert({
      project_id: id,
      uploaded_by: user.id,
      title: meta.title || null,
      caption: meta.caption || null,
      story: meta.story || null,
      image_path: storagePath,
      is_approved: true,
      display_order: baseOrder + i,
    })

    if (dbError) {
      await supabase.storage.from(PHOTOS_BUCKET).remove([storagePath])
      uploadedPaths.pop()
      await cleanupStoragePaths(supabase, uploadedPaths)
      return { error: projectMutationError('uploadPhotos', dbError) }
    }

    successCount++
  }

  revalidatePath(`/projects/${id}`)
  return { uploaded: successCount }
}

async function cleanupStoragePaths(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: string[]
) {
  if (paths.length === 0) return
  await supabase.storage.from(PHOTOS_BUCKET).remove(paths)
}

export async function deletePhoto(
  projectId: string,
  photoId: string
): Promise<PhotoActionState> {
  const projectUuid = parseUuid(projectId)
  const photoUuid = parseUuid(photoId)
  if (!projectUuid || !photoUuid) return { error: 'Identificador inválido.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar conectado.' }

  const access = await getProjectAccess(projectUuid, user.id)
  if (!access) return { error: 'Projeto não encontrado.' }

  const { data: photo, error: fetchError } = await supabase
    .from('photos')
    .select('id, project_id, uploaded_by, image_path')
    .eq('id', photoUuid)
    .eq('project_id', projectUuid)
    .maybeSingle()

  if (fetchError || !photo) {
    return { error: 'Foto não encontrada.' }
  }

  if (
    !canDeletePhoto(access.role, user.id, photo.uploaded_by, access.isOwner)
  ) {
    return { error: 'Sem permissão para excluir esta foto.' }
  }

  if (!isSafePhotoStoragePath(photo.image_path)) {
    return { error: 'Caminho de armazenamento inválido.' }
  }

  await supabase.storage.from(PHOTOS_BUCKET).remove([photo.image_path])
  const { error: deleteError } = await supabase.from('photos').delete().eq('id', photoUuid)

  if (deleteError) {
    return { error: projectMutationError('deletePhoto', deleteError) }
  }

  revalidatePath(`/projects/${projectUuid}`)
  return {}
}