/** Canonical app origin for server-generated auth links (magic link redirect). */
export function resolveAppOrigin(requestOrigin?: string): string {
  const fromRequest = requestOrigin?.replace(/\/$/, '')
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  // Prefer the live request host so emailed links match the site the user is on.
  if (fromRequest) return fromRequest
  if (configured) return configured
  return 'http://localhost:3000'
}