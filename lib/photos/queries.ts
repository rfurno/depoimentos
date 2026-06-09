import { createClient } from '@/lib/supabase/server'
import { attachSignedUrls } from '@/lib/photos/signed-url'
import { parseUuid } from '@/lib/validation/uuid'
import type { Photo } from '@/lib/types'

type PhotoRow = Photo & {
  comments: { count: number }[]
}

export type GalleryPhoto = Photo & {
  signedUrl: string | null
  comment_count: number
}

export async function getGalleryPhotos(
  projectId: string,
  options?: { includeUnapproved?: boolean }
): Promise<GalleryPhoto[]> {
  const id = parseUuid(projectId)
  if (!id) return []

  const supabase = await createClient()
  let query = supabase
    .from('photos')
    .select(
      'id, project_id, uploaded_by, title, caption, story, image_path, is_approved, display_order, created_at, comments(count)'
    )
    .eq('project_id', id)
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (!options?.includeUnapproved) {
    query = query.eq('is_approved', true)
  }

  const { data, error } = await query

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[getGalleryPhotos]', error.message)
    }
    return []
  }

  const rows = (data ?? []) as unknown as PhotoRow[]
  const normalized: Photo[] = rows.map((row) => ({
    id: row.id,
    project_id: row.project_id,
    uploaded_by: row.uploaded_by,
    title: row.title,
    caption: row.caption,
    story: row.story,
    image_path: row.image_path,
    is_approved: row.is_approved,
    display_order: row.display_order,
    created_at: row.created_at,
    comment_count: row.comments?.[0]?.count ?? 0,
  }))

  const withUrls = await attachSignedUrls(normalized, { projectId: id })
  return withUrls.map((p) => ({
    ...p,
    comment_count: p.comment_count ?? 0,
  }))
}