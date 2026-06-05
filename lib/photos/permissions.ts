import type { Role } from '@/lib/types'

/** Viewers can browse but not upload (Phase 3). */
export function canUploadPhotos(role: Role): boolean {
  return role === 'owner' || role === 'contributor' || role === 'admin'
}

export function canDeletePhoto(
  role: Role,
  userId: string,
  uploadedBy: string,
  isOwner: boolean
): boolean {
  return isOwner || userId === uploadedBy
}