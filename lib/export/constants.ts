/** Max photos per ZIP export request. */
export const MAX_EXPORT_PHOTOS = 100

/** Max total uncompressed image bytes per export (~200 MB). */
export const MAX_EXPORT_TOTAL_BYTES = 200 * 1024 * 1024

/** Per-user export rate limit window (1 hour). */
export const EXPORT_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000

/** Max export requests per user per window. */
export const EXPORT_RATE_LIMIT_MAX = 10