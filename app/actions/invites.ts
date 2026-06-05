'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { projectMutationError } from '@/lib/supabase/errors'
import { buildInviteUrl } from '@/lib/invites/build-url'
import {
  INVITE_DEFAULT_EXPIRY_DAYS,
  INVITE_EXPIRY_OPTIONS,
} from '@/lib/invites/constants'
import { getProjectAccess } from '@/lib/projects/queries'
import { parseUuid } from '@/lib/validation/uuid'
const inviteRoleSchema = z.enum(['contributor', 'viewer', 'admin'])

const createInviteSchema = z.object({
  role: inviteRoleSchema,
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' ? undefined : v))
    .pipe(z.union([z.string().email('E-mail inválido.'), z.undefined()])),
  expiresInDays: z.coerce
    .number()
    .int()
    .refine(
      (n) => (INVITE_EXPIRY_OPTIONS as readonly number[]).includes(n),
      `Escolha ${INVITE_EXPIRY_OPTIONS.join(', ')} dias de validade.`
    ),
})

export type InviteActionState = {
  error?: string
  fieldErrors?: {
    email?: string[]
    expiresInDays?: string[]
  }
  inviteUrl?: string
}

async function getRequestOrigin(): Promise<string | undefined> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  if (!host) return undefined
  return `${proto}://${host}`
}

export async function createProjectInvite(
  projectId: string,
  _prev: InviteActionState,
  formData: FormData
): Promise<InviteActionState> {
  const id = parseUuid(projectId)
  if (!id) return { error: 'Projeto inválido.' }

  const parsed = createInviteSchema.safeParse({
    role: formData.get('role') ?? 'contributor',
    email: formData.get('email') ?? '',
    expiresInDays: formData.get('expiresInDays') ?? INVITE_DEFAULT_EXPIRY_DAYS,
  })

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Você precisa estar conectado.' }

  const access = await getProjectAccess(id, user.id)
  if (!access?.isOwner) {
    return { error: 'Apenas o proprietário pode criar convites.' }
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + parsed.data.expiresInDays)

  const { data, error } = await supabase
    .from('project_invites')
    .insert({
      project_id: id,
      role: parsed.data.role,
      email: parsed.data.email ?? null,
      expires_at: expiresAt.toISOString(),
      created_by: user.id,
    })
    .select('token')
    .single()

  if (error) {
    return { error: projectMutationError('createProjectInvite', error) }
  }

  const origin = await getRequestOrigin()
  const inviteUrl = buildInviteUrl(data.token, origin)

  revalidatePath(`/projects/${id}`)
  return { inviteUrl }
}

export async function revokeProjectInvite(
  projectId: string,
  inviteId: string
): Promise<InviteActionState> {
  const projectUuid = parseUuid(projectId)
  const inviteUuid = parseUuid(inviteId)
  if (!projectUuid || !inviteUuid) {
    return { error: 'Identificador inválido.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Você precisa estar conectado.' }

  const access = await getProjectAccess(projectUuid, user.id)
  if (!access?.isOwner) {
    return { error: 'Apenas o proprietário pode revogar convites.' }
  }

  const { error } = await supabase
    .from('project_invites')
    .delete()
    .eq('id', inviteUuid)
    .eq('project_id', projectUuid)

  if (error) {
    return { error: projectMutationError('revokeProjectInvite', error) }
  }

  revalidatePath(`/projects/${projectUuid}`)
  return {}
}

