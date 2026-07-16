'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { projectMutationError } from '@/lib/supabase/errors'
import { buildInviteUrl } from '@/lib/invites/build-url'
import {
  INVITE_DEFAULT_EXPIRY_DAYS,
  INVITE_EXPIRY_OPTIONS,
} from '@/lib/invites/constants'
import { canManageInvites } from '@/lib/invites/permissions'
import { checkResendLoginRateLimit } from '@/lib/invites/resend-login-rate-limit'
import { redeemProjectInvite } from '@/lib/invites/redeem'
import { getInvitePreview } from '@/lib/invites/queries'
import { establishSessionViaInviteMagicLink } from '@/lib/auth/invite-login'
import { resolveAppOrigin } from '@/lib/auth/app-origin'
import { redirectToProjectAfterInvite } from '@/lib/invites/redirect-after-accept'
import { getProjectAccess } from '@/lib/projects/queries'
import { normalizeOptionalPhone } from '@/lib/validation/phone'
import { parseUuid } from '@/lib/validation/uuid'

const inviteRoleSchema = z.enum(['contributor', 'viewer', 'admin'])

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === '' ? undefined : v))

const createInviteSchema = z.object({
  role: inviteRoleSchema,
  inviteeName: optionalText.pipe(z.union([z.string().max(120), z.undefined()])),
  email: optionalText.pipe(z.union([z.string().email('E-mail inválido.'), z.undefined()])),
  inviteePhone: optionalText,
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
    inviteePhone?: string[]
    expiresInDays?: string[]
  }
  inviteUrl?: string
}

export type AcceptInviteState = {
  error?: string
  projectId?: string
}

export type ResendLoginState = {
  error?: string
  sent?: boolean
}

async function getRequestOrigin(): Promise<string | undefined> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  if (!host) return undefined
  return `${proto}://${host}`
}

async function assertCanManageInvites(projectId: string, userId: string) {
  const id = parseUuid(projectId)
  if (!id) return { error: 'Projeto inválido.' as const }
  const access = await getProjectAccess(id, userId)
  if (!access || !canManageInvites(access)) {
    return { error: 'Sem permissão para gerenciar convites neste projeto.' as const }
  }
  return { projectUuid: id, access }
}

export async function createProjectInvite(
  projectId: string,
  _prev: InviteActionState,
  formData: FormData
): Promise<InviteActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar conectado.' }

  const manage = await assertCanManageInvites(projectId, user.id)
  if ('error' in manage) return manage

  const parsed = createInviteSchema.safeParse({
    role: formData.get('role') ?? 'contributor',
    inviteeName: formData.get('inviteeName') ?? '',
    email: formData.get('email') ?? '',
    inviteePhone: formData.get('inviteePhone') ?? '',
    expiresInDays: formData.get('expiresInDays') ?? INVITE_DEFAULT_EXPIRY_DAYS,
  })

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const phoneHint = parsed.data.inviteePhone
    ? normalizeOptionalPhone(parsed.data.inviteePhone)
    : null
  if (parsed.data.inviteePhone && !phoneHint) {
    return { fieldErrors: { inviteePhone: ['Telefone inválido.'] } }
  }

  if (parsed.data.email) {
    const { data: duplicate } = await supabase
      .from('project_invites')
      .select('id')
      .eq('project_id', manage.projectUuid)
      .ilike('email', parsed.data.email)
      .is('redeemed_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (duplicate) {
      return {
        error:
          'Já existe um convite ativo para este e-mail neste projeto. Revogue-o antes de criar outro.',
      }
    }
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + parsed.data.expiresInDays)

  // Email-bound invites are single-use; open links can be shared with many people
  const multiUse = !parsed.data.email

  const { data, error } = await supabase
    .from('project_invites')
    .insert({
      project_id: manage.projectUuid,
      role: parsed.data.role,
      invitee_name: parsed.data.inviteeName ?? null,
      email: parsed.data.email ?? null,
      invitee_phone: phoneHint,
      multi_use: multiUse,
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

  revalidatePath(`/projects/${manage.projectUuid}`)
  return { inviteUrl }
}

/** Log in (no extra email) and redeem invite for visitors who are not signed in yet. */
export async function acceptInviteWithLogin(
  token: string,
  _prev: AcceptInviteState,
  formData?: FormData
): Promise<AcceptInviteState> {
  const tokenUuid = parseUuid(token)
  if (!tokenUuid) return { error: 'Link de convite inválido.' }

  const preview = await getInvitePreview(token)
  if (!preview) return { error: 'Convite não encontrado.' }
  if (!preview.canRedeem) {
    if (preview.isExpired) return { error: 'Este convite expirou.' }
    if (preview.isRedeemed) {
      // Single-use only: if the signed-in user is already a member, send them in
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const access = await getProjectAccess(preview.projectId, user.id)
        if (access) {
          await redirectToProjectAfterInvite(user.id, preview.projectId)
        }
      }
      return { error: 'Este convite já foi utilizado.' }
    }
    return { error: 'Este convite não está mais disponível.' }
  }

  const formEmail = formData?.get('email')?.toString().trim()
  const email = preview.email ?? formEmail
  if (!email) return { error: 'Informe seu e-mail para continuar.' }

  if (preview.email && preview.email.toLowerCase() !== email.toLowerCase()) {
    return { error: 'Este convite é para outro e-mail.' }
  }

  const origin = resolveAppOrigin(await getRequestOrigin())
  const callbackUrl = `${origin}/auth/callback?invite=${encodeURIComponent(token)}`

  const login = await establishSessionViaInviteMagicLink(email, callbackUrl)
  if (login.error || !login.userId) {
    return { error: login.error ?? 'Não foi possível entrar.' }
  }

  const phone =
    formData?.get('phone') != null ? String(formData.get('phone')) : undefined
  const displayName =
    formData?.get('displayName') != null
      ? String(formData.get('displayName'))
      : undefined

  const result = await redeemProjectInvite(token, login.userId, login.userEmail, {
    phone,
    displayName,
  })
  if (result.error) {
    if (result.alreadyMember && result.projectId) {
      await redirectToProjectAfterInvite(login.userId, result.projectId)
    }
    return { error: result.error, projectId: result.projectId }
  }

  if (result.projectId) {
    revalidatePath(`/projects/${result.projectId}`)
    await redirectToProjectAfterInvite(login.userId, result.projectId)
  }

  return { error: 'Não foi possível aceitar o convite.' }
}

export async function acceptProjectInvite(
  token: string,
  _prev: AcceptInviteState,
  formData?: FormData
): Promise<AcceptInviteState> {
  const tokenUuid = parseUuid(token)
  if (!tokenUuid) return { error: 'Link de convite inválido.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Você precisa estar conectado.' }

  const phone =
    formData?.get('phone') != null ? String(formData.get('phone')) : undefined
  const displayName =
    formData?.get('displayName') != null
      ? String(formData.get('displayName'))
      : undefined

  const result = await redeemProjectInvite(token, user.id, user.email, {
    phone,
    displayName,
  })
  if (result.error) {
    if (result.alreadyMember && result.projectId) {
      await redirectToProjectAfterInvite(user.id, result.projectId)
    }
    return {
      error: result.error,
      projectId: result.projectId,
    }
  }

  if (result.projectId) {
    revalidatePath(`/projects/${result.projectId}`)
    await redirectToProjectAfterInvite(user.id, result.projectId)
  }

  return { error: 'Não foi possível aceitar o convite.' }
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

  const manage = await assertCanManageInvites(projectId, user.id)
  if ('error' in manage) return manage

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

/** Owner/admin: send a fresh login magic link to an active member (not a new project invite). */
export async function resendMemberLoginLink(
  projectId: string,
  memberUserId: string
): Promise<ResendLoginState> {
  const projectUuid = parseUuid(projectId)
  const memberUuid = parseUuid(memberUserId)
  if (!projectUuid || !memberUuid) {
    return { error: 'Identificador inválido.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar conectado.' }

  const manage = await assertCanManageInvites(projectId, user.id)
  if ('error' in manage) return manage

  const { data: membership } = await supabase
    .from('project_collaborators')
    .select('id')
    .eq('project_id', projectUuid)
    .eq('user_id', memberUuid)
    .maybeSingle()

  if (!membership) {
    return { error: 'Esta pessoa ainda não faz parte do projeto.' }
  }

  const rate = checkResendLoginRateLimit(user.id)
  if (!rate.allowed) {
    return {
      error: `Limite de reenvios atingido. Tente novamente em ${rate.retryAfterSec ?? 60} segundos.`,
    }
  }

  const admin = createAdminClient()
  if (!admin) {
    return { error: 'Configure SUPABASE_SERVICE_ROLE_KEY para reenviar links de entrada.' }
  }

  const { data: authUser, error: userError } = await admin.auth.admin.getUserById(memberUuid)
  const email = authUser.user?.email
  if (userError || !email) {
    return { error: 'Não foi possível obter o e-mail deste membro.' }
  }

  const origin = resolveAppOrigin(await getRequestOrigin())
  const { error: otpError } = await admin.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?redirectTo=${encodeURIComponent('/dashboard')}`,
    },
  })

  if (otpError) {
    return { error: 'Não foi possível enviar o link de entrada.' }
  }

  return { sent: true }
}