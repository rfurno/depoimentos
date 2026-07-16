import { createAdminClient } from '@/lib/supabase/admin'
import { projectMutationError } from '@/lib/supabase/errors'
import { normalizeOptionalPhone } from '@/lib/validation/phone'
import { parseUuid } from '@/lib/validation/uuid'

export type RedeemInviteResult = {
  projectId?: string
  projectTitle?: string
  error?: string
  alreadyMember?: boolean
}

const SERVICE_KEY_MSG =
  'Configure SUPABASE_SERVICE_ROLE_KEY em .env.local para aceitar convites (necessário para adicionar colaboradores).'

const RPC_MISSING_MSG =
  'Execute supabase/multi-use-invites.sql (e scripts anteriores) no SQL Editor do Supabase para aceitar convites.'

const DISPLAY_NAME_MAX = 120

type RedeemRpcResult = {
  error?: string
  project_id?: string
  project_title?: string
  already_member?: boolean
}

export type RedeemInviteOptions = {
  phone?: string | null
  displayName?: string | null
}

function normalizeDisplayName(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const trimmed = raw.trim().replace(/\s+/g, ' ')
  if (!trimmed) return null
  return trimmed.slice(0, DISPLAY_NAME_MAX)
}

/** Redeem an invite for the authenticated user (server-only, atomic RPC + service role). */
export async function redeemProjectInvite(
  token: string,
  userId: string,
  userEmail: string | null | undefined,
  phoneOrOptions?: string | null | RedeemInviteOptions
): Promise<RedeemInviteResult> {
  const tokenUuid = parseUuid(token)
  if (!tokenUuid) {
    return { error: 'Link de convite inválido.' }
  }

  const options: RedeemInviteOptions =
    phoneOrOptions != null && typeof phoneOrOptions === 'object'
      ? phoneOrOptions
      : { phone: phoneOrOptions as string | null | undefined }

  const normalizedPhone = options.phone ? normalizeOptionalPhone(options.phone) : null
  if (options.phone?.trim() && !normalizedPhone) {
    return { error: 'Telefone inválido. Use formato internacional, ex: +5511999999999.' }
  }

  const displayName = normalizeDisplayName(options.displayName)

  const admin = createAdminClient()
  if (!admin) {
    return { error: SERVICE_KEY_MSG }
  }

  const { data, error } = await admin.rpc('redeem_project_invite', {
    p_token: tokenUuid,
    p_user_id: userId,
    p_user_email: userEmail ?? '',
    p_phone: normalizedPhone ?? '',
    p_display_name: displayName ?? '',
  })

  if (error) {
    const msg = error.message ?? ''
    if (msg.includes('redeem_project_invite') || msg.includes('Could not find the function')) {
      return { error: RPC_MISSING_MSG }
    }
    return { error: projectMutationError('redeemProjectInvite', error) }
  }

  const result = (data ?? {}) as RedeemRpcResult

  if (result.error) {
    return {
      error: result.error,
      projectId: result.project_id,
      projectTitle: result.project_title,
      alreadyMember: Boolean(result.already_member),
    }
  }

  if (!result.project_id) {
    return { error: 'Não foi possível aceitar o convite.' }
  }

  return {
    projectId: result.project_id,
    projectTitle: result.project_title,
  }
}