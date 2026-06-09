'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { projectMutationError } from '@/lib/supabase/errors'
import { normalizeOptionalPhone } from '@/lib/validation/phone'
import { parseUuid } from '@/lib/validation/uuid'

const phoneSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === '' ? undefined : v))

export type ProfileActionState = {
  error?: string
  saved?: boolean
}

export async function saveOptionalPhone(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const raw = phoneSchema.parse(formData.get('phone') ?? undefined)
  if (!raw) {
    return { saved: true }
  }

  const phone = normalizeOptionalPhone(raw)
  if (!phone) {
    return { error: 'Telefone inválido. Exemplo: +5511999999999 ou (11) 99999-9999.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar conectado.' }

  const { error } = await supabase
    .from('profiles')
    .update({ phone })
    .eq('id', user.id)

  if (error) {
    return { error: projectMutationError('saveOptionalPhone', error) }
  }

  const projectId = formData.get('projectId')
  if (typeof projectId === 'string' && parseUuid(projectId)) {
    revalidatePath(`/projects/${projectId}`)
  }

  return { saved: true }
}