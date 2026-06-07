/** Default label for new users when no full_name is provided. */
export function defaultDisplayNameFromEmail(email: string): string {
  const trimmed = email.trim().toLowerCase()
  const at = trimmed.indexOf('@')
  if (at <= 0 || at === trimmed.length - 1) return 'Familiar'

  const local = trimmed.slice(0, at)
  const domain = trimmed.slice(at + 1)

  // e.g. rfurno@proton.me → "rfurno (proton.me)" — distinct from rfurno@protonmail.com
  return `${local} (${domain})`
}