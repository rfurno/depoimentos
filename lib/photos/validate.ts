import {
  ALLOWED_PHOTO_MIME_TYPES,
  MAX_PHOTO_BYTES,
  type AllowedPhotoMime,
} from '@/lib/photos/constants'

export type FileValidationResult =
  | { ok: true; mime: AllowedPhotoMime }
  | { ok: false; error: string }

/** Magic-byte sniffing — do not trust client-supplied Content-Type alone. */
export function sniffImageMime(bytes: Uint8Array): AllowedPhotoMime | null {
  if (bytes.length < 12) return null

  // JPEG (SOI marker FF D8; third byte may vary)
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg'
  // PNG
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png'
  }
  // GIF
  const gif = String.fromCharCode(bytes[0], bytes[1], bytes[2])
  if (gif === 'GIF') return 'image/gif'
  // WebP (RIFF....WEBP)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }
  // HEIC/HEIF (ftyp box at offset 4)
  if (bytes.length >= 12) {
    const ftyp = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7])
    if (ftyp === 'ftyp') {
      const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11])
      if (brand.startsWith('heic') || brand.startsWith('heix') || brand.startsWith('mif1')) {
        return 'image/heic'
      }
    }
  }

  return null
}

export function validatePhotoFile(file: File, bytes: Uint8Array): FileValidationResult {
  if (file.size === 0) {
    return { ok: false, error: 'Arquivo vazio.' }
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: 'Imagem muito grande (máx. 10 MB).' }
  }
  const declared = file.type as AllowedPhotoMime
  if (!ALLOWED_PHOTO_MIME_TYPES.includes(declared)) {
    return {
      ok: false,
      error: 'Formato não suportado. Use JPEG, PNG, WebP ou GIF.',
    }
  }

  const sniffed = sniffImageMime(bytes)
  if (!sniffed) {
    return { ok: false, error: 'O arquivo não parece ser uma imagem válida.' }
  }

  // HEIF vs HEIC declared interchangeably on some devices
  const declaredOk =
    sniffed === declared ||
    (declared === 'image/heif' && sniffed === 'image/heic') ||
    (declared === 'image/heic' && sniffed === 'image/heic')

  if (!declaredOk) {
    return { ok: false, error: 'O tipo do arquivo não corresponde ao conteúdo real.' }
  }

  return { ok: true, mime: sniffed }
}

export function extensionForMime(mime: AllowedPhotoMime): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/gif':
      return 'gif'
    case 'image/heic':
      return 'heic'
    case 'image/heif':
      return 'heif'
    default:
      return 'jpg'
  }
}