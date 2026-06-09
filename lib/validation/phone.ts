/** Normalize optional phone to E.164-ish string, or null if empty/invalid. */
export function normalizeOptionalPhone(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '')
    if (digits.length < 10 || digits.length > 15) return null
    return `+${digits}`
  }

  const digits = trimmed.replace(/\D/g, '')
  if (digits.length >= 10 && digits.length <= 11) {
    return `+55${digits}`
  }
  if (digits.length >= 12 && digits.length <= 15) {
    return `+${digits}`
  }

  return null
}

export function formatPhoneHint(phone: string): string {
  if (phone.length <= 6) return phone
  const tail = phone.slice(-4)
  return `•••• ${tail}`
}