import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PHOTOS_BUCKET, SIGNED_URL_EXPIRY_SEC } from '@/lib/photos/constants'
import { isSafePhotoStoragePath, storagePathMatchesProject } from '@/lib/storage/path-guard'

export async function createSignedPhotoUrl(
  imagePath: string,
  options?: { projectId?: string }
): Promise<string | null> {
  if (!isSafePhotoStoragePath(imagePath)) return null
  if (options?.projectId && !storagePathMatchesProject(imagePath, options.projectId)) {
    return null
  }

  const admin = createAdminClient()
  const supabase = admin ?? (await createClient())

  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrl(imagePath, SIGNED_URL_EXPIRY_SEC)

  if (error || !data?.signedUrl) {
    if (process.env.NODE_ENV === 'development' && error) {
      console.error('[signedUrl]', error.message)
    }
    return null
  }

  return data.signedUrl
}

export async function attachSignedUrls<T extends { image_path: string }>(
  rows: T[],
  options?: { projectId?: string }
): Promise<(T & { signedUrl: string | null })[]> {
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      signedUrl: await createSignedPhotoUrl(row.image_path, options),
    }))
  )
}