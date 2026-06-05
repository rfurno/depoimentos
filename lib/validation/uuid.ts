import { z } from 'zod'

const uuidSchema = z.string().uuid()

export function parseUuid(value: string): string | null {
  const result = uuidSchema.safeParse(value)
  return result.success ? result.data : null
}