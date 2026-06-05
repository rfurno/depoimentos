import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProjectAccess } from '@/lib/projects/queries'
import { parseUuid } from '@/lib/validation/uuid'
import type { Comment } from '@/lib/types'

export type CommentWithAuthor = Comment & {
  author_name: string
}

async function resolveAuthorNames(
  userIds: string[],
  currentUserId: string,
  currentUserDisplayName: string
): Promise<Map<string, string>> {
  const names = new Map<string, string>()
  const unique = [...new Set(userIds)]

  for (const id of unique) {
    if (id === currentUserId) {
      names.set(id, currentUserDisplayName)
    }
  }

  const others = unique.filter((id) => id !== currentUserId)
  if (others.length === 0) return names

  const admin = createAdminClient()
  if (admin) {
    const { data } = await admin
      .from('profiles')
      .select('id, full_name')
      .in('id', others)

    for (const row of data ?? []) {
      names.set(row.id, row.full_name?.trim() || 'Familiar')
    }
  }

  for (const id of others) {
    if (!names.has(id)) names.set(id, 'Familiar')
  }

  return names
}

export async function getCommentsForPhoto(
  projectId: string,
  photoId: string,
  userId: string,
  currentUserDisplayName: string
): Promise<CommentWithAuthor[]> {
  const projectUuid = parseUuid(projectId)
  const photoUuid = parseUuid(photoId)
  if (!projectUuid || !photoUuid) return []

  const access = await getProjectAccess(projectUuid, userId)
  if (!access) return []

  const supabase = await createClient()

  const { data: photo } = await supabase
    .from('photos')
    .select('id')
    .eq('id', photoUuid)
    .eq('project_id', projectUuid)
    .maybeSingle()

  if (!photo) return []

  const { data, error } = await supabase
    .from('comments')
    .select('id, photo_id, user_id, content, created_at')
    .eq('photo_id', photoUuid)
    .order('created_at', { ascending: true })

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[getCommentsForPhoto]', error.message)
    }
    return []
  }

  const rows = data ?? []
  const nameByUser = await resolveAuthorNames(
    rows.map((r) => r.user_id),
    userId,
    currentUserDisplayName
  )

  return rows.map((row) => ({
    ...row,
    author_name: nameByUser.get(row.user_id) ?? 'Familiar',
  }))
}