export const PHOTOS_BUCKET = 'photos'

/** Max size per image file (10 MB). */
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024

/** Max files per upload request. */
export const MAX_PHOTOS_PER_UPLOAD = 20

export const ALLOWED_PHOTO_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
] as const

export type AllowedPhotoMime = (typeof ALLOWED_PHOTO_MIME_TYPES)[number]

/** Signed URL lifetime (1 hour). */
export const SIGNED_URL_EXPIRY_SEC = 60 * 60