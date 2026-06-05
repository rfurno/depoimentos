const DEFAULT_REDIRECT = '/dashboard'

/** UUID v4 (accepts any RFC variant nibble in position 13 for DB compatibility). */
const PROJECT_PATH =
  /^\/projects\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\/edit|\/slideshow)?$/i

const INVITE_PATH =
  /^\/invite\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Sanitize post-login redirect paths to prevent open redirects and path traversal.
 * Only allows /dashboard, /projects, /projects/:uuid[/edit|/slideshow], and /invite/:token.
 */
export function sanitizeRedirectPath(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return DEFAULT_REDIRECT

  let path = raw.trim()
  try {
    path = decodeURIComponent(path)
  } catch {
    return DEFAULT_REDIRECT
  }

  if (!path.startsWith('/') || path.startsWith('//')) return DEFAULT_REDIRECT
  if (path.includes('://') || path.includes('..') || path.includes('\\')) {
    return DEFAULT_REDIRECT
  }

  const pathname = path.split('?')[0].split('#')[0]
  if (/[:@]/.test(pathname)) return DEFAULT_REDIRECT

  if (pathname === '/dashboard' || pathname === '/projects') return pathname
  if (PROJECT_PATH.test(pathname)) return pathname
  if (INVITE_PATH.test(pathname)) return pathname

  return DEFAULT_REDIRECT
}