const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 5

const hits = new Map<string, number[]>()

export function checkResendLoginRateLimit(managerUserId: string): {
  allowed: boolean
  retryAfterSec?: number
} {
  const now = Date.now()
  const windowStart = now - WINDOW_MS
  const list = (hits.get(managerUserId) ?? []).filter((t) => t > windowStart)

  if (list.length >= MAX_PER_WINDOW) {
    const oldest = list[0] ?? now
    return {
      allowed: false,
      retryAfterSec: Math.ceil((oldest + WINDOW_MS - now) / 1000),
    }
  }

  list.push(now)
  hits.set(managerUserId, list)
  return { allowed: true }
}