import { parseUuid } from '@/lib/validation/uuid'

/**
 * Allowed storage object paths: `{projectUuid}/{fileUuid}.{ext}`
 * Rejects traversal, absolute paths, and unexpected shapes before storage ops.
 */
const SAFE_STORAGE_PATH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|gif|heic|heif)$/i

export function isSafePhotoStoragePath(path: string): boolean {
  if (!path || path.includes('..') || path.startsWith('/')) return false
  return SAFE_STORAGE_PATH.test(path)
}

/** When signing URLs for a project page, ensure the object belongs to that project folder. */
export function storagePathMatchesProject(path: string, projectId: string): boolean {
  if (!isSafePhotoStoragePath(path)) return false
  const projectUuid = parseUuid(projectId)
  if (!projectUuid) return false
  return path.toLowerCase().startsWith(`${projectUuid.toLowerCase()}/`)
}