import { EXPORT_RATE_LIMIT_MAX, EXPORT_RATE_LIMIT_WINDOW_MS } from '@/lib/export/constants'

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

/** Simple in-process export rate limit (per server instance). */
export function checkExportRateLimit(userId: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now()
  const bucket = buckets.get(userId)

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(userId, { count: 1, resetAt: now + EXPORT_RATE_LIMIT_WINDOW_MS })
    return { allowed: true }
  }

  if (bucket.count >= EXPORT_RATE_LIMIT_MAX) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    }
  }

  bucket.count += 1
  return { allowed: true }
}