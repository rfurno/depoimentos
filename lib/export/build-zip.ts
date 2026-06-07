import JSZip from 'jszip'
import { createAdminClient } from '@/lib/supabase/admin'
import { MAX_EXPORT_PHOTOS, MAX_EXPORT_TOTAL_BYTES } from '@/lib/export/constants'
import { PHOTOS_BUCKET } from '@/lib/photos/constants'
import { isSafePhotoStoragePath, storagePathMatchesProject } from '@/lib/storage/path-guard'
import { buildMemoriesMarkdown } from '@/lib/export/memories-md'
import { getExportPhotoRows } from '@/lib/admin/queries'
import type { ExportMemory } from '@/lib/types'

function extensionFromPath(path: string): string {
  const dot = path.lastIndexOf('.')
  if (dot === -1) return 'jpg'
  return path.slice(dot + 1).toLowerCase() || 'jpg'
}

function safeFilename(index: number, photoId: string, title: string | null, path: string): string {
  const ext = extensionFromPath(path)
  const slug = (title ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  const base = slug || photoId.slice(0, 8)
  return `${String(index + 1).padStart(3, '0')}-${base}.${ext}`
}

export async function buildProjectExportZip(
  projectId: string,
  photoIds?: string[]
): Promise<{ buffer: Buffer; filename: string } | { error: string }> {
  const data = await getExportPhotoRows(projectId, photoIds)
  if (!data) return { error: 'Projeto não encontrado.' }
  if (data.photos.length === 0) return { error: 'Nenhuma foto selecionada para exportar.' }
  if (data.photos.length > MAX_EXPORT_PHOTOS) {
    return { error: `Máximo de ${MAX_EXPORT_PHOTOS} fotos por exportação.` }
  }

  const admin = createAdminClient()
  if (!admin) {
    return {
      error: 'Configure SUPABASE_SERVICE_ROLE_KEY para exportar imagens do bucket privado.',
    }
  }

  const supabase = admin
  const exportedAt = new Date().toISOString()
  const memories: ExportMemory[] = []

  const zip = new JSZip()
  const imagesFolder = zip.folder('images')
  if (!imagesFolder) return { error: 'Falha ao criar arquivo ZIP.' }

  let totalBytes = 0

  for (let i = 0; i < data.photos.length; i++) {
    const photo = data.photos[i]
    if (
      !isSafePhotoStoragePath(photo.image_path) ||
      !storagePathMatchesProject(photo.image_path, projectId)
    ) {
      continue
    }

    const { data: blob, error } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .download(photo.image_path)

    if (error || !blob) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[export:download]', photo.image_path, error?.message)
      }
      continue
    }

    const filename = safeFilename(i, photo.id, photo.title, photo.image_path)
    const arrayBuffer = await blob.arrayBuffer()
    totalBytes += arrayBuffer.byteLength
    if (totalBytes > MAX_EXPORT_TOTAL_BYTES) {
      return {
        error: `Exportação excede o limite de ${Math.round(MAX_EXPORT_TOTAL_BYTES / (1024 * 1024))} MB. Selecione menos fotos.`,
      }
    }
    imagesFolder.file(filename, arrayBuffer)

    const { data: comments } = await supabase
      .from('comments')
      .select('content, created_at, user_id')
      .eq('photo_id', photo.id)
      .order('created_at', { ascending: true })

    const commentUserIds = [...new Set((comments ?? []).map((c) => c.user_id))]
    const { data: profiles } = commentUserIds.length
      ? await supabase.from('profiles').select('id, full_name').in('id', commentUserIds)
      : { data: [] as { id: string; full_name: string | null }[] }

    const nameById = new Map(
      (profiles ?? []).map((p) => [p.id, p.full_name?.trim() || 'Familiar'])
    )

    memories.push({
      id: photo.id,
      title: photo.title,
      caption: photo.caption,
      story: photo.story,
      image_filename: `images/${filename}`,
      uploaded_by_name: photo.uploader_name,
      created_at: photo.created_at,
      comments: (comments ?? []).map((c) => ({
        author_name: nameById.get(c.user_id) ?? 'Familiar',
        content: c.content,
        created_at: c.created_at,
      })),
    })
  }

  if (memories.length === 0) {
    return { error: 'Não foi possível baixar nenhuma imagem para o ZIP.' }
  }

  const markdown = buildMemoriesMarkdown(
    {
      title: data.project.title,
      description: data.project.description,
      exported_at: exportedAt,
    },
    memories
  )

  zip.file('MEMORIES.md', markdown)
  zip.file('memories.json', JSON.stringify({ project: data.project, memories }, null, 2))

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  const slug = data.project.title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 40)

  const date = exportedAt.slice(0, 10)
  return { buffer: zipBuffer, filename: `storyloom-${slug || 'projeto'}-${date}.zip` }
}