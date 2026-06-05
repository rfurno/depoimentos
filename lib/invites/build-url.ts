import { INVITE_PATH_PREFIX } from '@/lib/invites/constants'

/** Build a shareable invite URL (server-side; uses NEXT_PUBLIC_APP_URL when set). */
export function buildInviteUrl(token: string, origin?: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || origin || '').replace(/\/$/, '')
  const path = `${INVITE_PATH_PREFIX}/${token}`
  return base ? `${base}${path}` : path
}