import { createAdminClient } from '@/lib/supabase/admin'
import { projectMutationError } from '@/lib/supabase/errors'
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
  'Execute supabase/redeem-project-invite.sql no SQL Editor do Supabase para aceitar convites.';

type RedeemRpcResult = {
  error?: string
  project_id?: string
  project_title?: string
  already_member?: boolean
}

/** Redeem an invite for the authenticated user (server-only, atomic RPC + service role). */
export async function redeemProjectInvite(
  token: string,
  userId: string,
  userEmail: string | null | undefined
): Promise<RedeemInviteResult> {
  const tokenUuid = parseUuid(token)
  if (!tokenUuid) {
    return { error: 'Link de convite inválido.' }
  }

  const admin = createAdminClient()
  if (!admin) {
    return { error: SERVICE_KEY_MSG }
  }

  const { data, error } = await admin.rpc('redeem_project_invite', {
    p_token: tokenUuid,
    p_user_id: userId,
    p_user_email: userEmail ?? '',
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