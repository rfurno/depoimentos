import { randomUUID } from 'crypto'
import type { AllowedPhotoMime } from '@/lib/photos/constants'
import { extensionForMime } from '@/lib/photos/validate'

/** Storage object path: `{projectId}/{uuid}.{ext}` — no user-controlled segments. */
export function buildPhotoStoragePath(projectId: string, mime: AllowedPhotoMime): string {
  const ext = extensionForMime(mime)
  return `${projectId}/${randomUUID()}.${ext}`
}