export const PENDING_INVITE_COOKIE = 'storyloom_pending_invite'

const MAX_AGE_SEC = 60 * 60

/** Client-side: remember invite token until auth callback (PKCE / Site URL may drop query params). */
export function setPendingInviteCookie(token: string): void {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${PENDING_INVITE_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${MAX_AGE_SEC}; SameSite=Lax${secure}`
}

export function clearPendingInviteCookie(): void {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${PENDING_INVITE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
}

export function readPendingInviteCookie(
  raw: string | undefined | null
): string | null {
  if (!raw) return null
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}