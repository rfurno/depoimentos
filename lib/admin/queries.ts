import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getGalleryPhotos, type GalleryPhoto } from '@/lib/photos/queries'
import { parseUuid } from '@/lib/validation/uuid'
import type { CollaboratorRole, Project } from '@/lib/types'

export type CollaboratorRow = {
  id: string
  user_id: string
  role: CollaboratorRole
  created_at: string
  display_name: string
}

export type ModerationComment = {
  id: string
  photo_id: string
  photo_title: string | null
  user_id: string
  author_name: string
  content: string
  created_at: string
}

export async function getAdminPhotos(projectId: string): Promise<GalleryPhoto[]> {
  return getGalleryPhotos(projectId, { includeUnapproved: true })
}

export async function getProjectCollaborators(projectId: string): Promise<CollaboratorRow[]> {
  const id = parseUuid(projectId)
  if (!id) return []

  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('project_collaborators')
    .select('id, user_id, role, created_at')
    .eq('project_id', id)
    .order('created_at', { ascending: true })

  const userIds = (rows ?? []).map((r) => r.user_id)
  const names = await resolveProfileNames(userIds)

  return (rows ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    role: row.role as CollaboratorRole,
    created_at: row.created_at,
    display_name: names.get(row.user_id) ?? 'Familiar',
  }))
}

export async function getModerationComments(projectId: string): Promise<ModerationComment[]> {
  const id = parseUuid(projectId)
  if (!id) return []

  const supabase = await createClient()
  const { data: photos } = await supabase
    .from('photos')
    .select('id, title')
    .eq('project_id', id)

  const photoIds = (photos ?? []).map((p) => p.id)
  if (photoIds.length === 0) return []

  const titleByPhoto = new Map((photos ?? []).map((p) => [p.id, p.title]))

  const { data: comments } = await supabase
    .from('comments')
    .select('id, photo_id, user_id, content, created_at')
    .in('photo_id', photoIds)
    .order('created_at', { ascending: false })

  const userIds = [...new Set((comments ?? []).map((c) => c.user_id))]
  const names = await resolveProfileNames(userIds)

  return (comments ?? []).map((c) => ({
    id: c.id,
    photo_id: c.photo_id,
    photo_title: titleByPhoto.get(c.photo_id) ?? null,
    user_id: c.user_id,
    author_name: names.get(c.user_id) ?? 'Familiar',
    content: c.content,
    created_at: c.created_at,
  }))
}

async function resolveProfileNames(userIds: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>()
  if (userIds.length === 0) return names

  const admin = createAdminClient()
  const client = admin ?? (await createClient())
  const { data } = await client
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds)

  for (const row of data ?? []) {
    names.set(row.id, row.full_name?.trim() || 'Familiar')
  }
  return names
}

export type ExportPhotoRow = {
  id: string
  title: string | null
  caption: string | null
  story: string | null
  image_path: string
  created_at: string
  uploaded_by: string
  uploader_name: string
}

export async function getExportPhotoRows(
  projectId: string,
  photoIds?: string[]
): Promise<{ project: Project; photos: ExportPhotoRow[] } | null> {
  const id = parseUuid(projectId)
  if (!id) return null

  const supabase = await createClient()
  const { data: project } = await supabase
    .from('projects')
    .select('id, owner_id, title, description, created_at, updated_at')
    .eq('id', id)
    .maybeSingle()

  if (!project) return null

  let query = supabase
    .from('photos')
    .select('id, title, caption, story, image_path, created_at, uploaded_by')
    .eq('project_id', id)
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (photoIds && photoIds.length > 0) {
    query = query.in('id', photoIds)
  }

  const { data: photos } = await query
  const uploaderIds = [...new Set((photos ?? []).map((p) => p.uploaded_by))]
  const uploaderNames = await resolveProfileNames(uploaderIds)

  return {
    project,
    photos: (photos ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      caption: p.caption,
      story: p.story,
      image_path: p.image_path,
      created_at: p.created_at,
      uploaded_by: p.uploaded_by,
      uploader_name: uploaderNames.get(p.uploaded_by) ?? 'Familiar',
    })),
  }
}