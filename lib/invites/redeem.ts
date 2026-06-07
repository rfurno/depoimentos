import { createAdminClient } from '@/lib/supabase/admin'
import { projectMutationError } from '@/lib/supabase/errors'
import { parseUuid } from '@/lib/validation/uuid'
import type { InviteRole } from '@/lib/types'

export type RedeemInviteResult = {
  projectId?: string
  projectTitle?: string
  error?: string
  alreadyMember?: boolean
}

const SERVICE_KEY_MSG =
  'Configure SUPABASE_SERVICE_ROLE_KEY em .env.local para aceitar convites (necessário para adicionar colaboradores).'

/** Redeem an invite for the authenticated user (server-only, uses service role). */
export async function redeemProjectInvite(
  token: string,
  userId: string
): Promise<RedeemInviteResult> {
  const tokenUuid = parseUuid(token)
  if (!tokenUuid) {
    return { error: 'Link de convite inválido.' }
  }

  const admin = createAdminClient()
  if (!admin) {
    return { error: SERVICE_KEY_MSG }
  }

  const { data: invite, error: inviteError } = await admin
    .from('project_invites')
    .select('id, project_id, role, email, expires_at, redeemed_at')
    .eq('token', tokenUuid)
    .maybeSingle()

  if (inviteError || !invite) {
    return { error: 'Convite não encontrado ou inválido.' }
  }

  if (invite.redeemed_at) {
    return {
      error: 'Este convite já foi utilizado.',
      projectId: invite.project_id,
      alreadyMember: true,
    }
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return { error: 'Este convite expirou. Peça um novo link ao proprietário do projeto.' }
  }

  const { data: project, error: projectError } = await admin
    .from('projects')
    .select('id, title, owner_id')
    .eq('id', invite.project_id)
    .maybeSingle()

  if (projectError || !project) {
    return { error: 'Projeto não encontrado.' }
  }

  if (project.owner_id === userId) {
    return {
      error: 'Você já é o proprietário deste projeto.',
      projectId: project.id,
      projectTitle: project.title,
      alreadyMember: true,
    }
  }

  const { data: existing } = await admin
    .from('project_collaborators')
    .select('id')
    .eq('project_id', invite.project_id)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    return {
      error: 'Você já participa deste projeto.',
      projectId: project.id,
      projectTitle: project.title,
      alreadyMember: true,
    }
  }

  const redeemedAt = new Date().toISOString()

  const { data: claimed, error: claimError } = await admin
    .from('project_invites')
    .update({
      redeemed_at: redeemedAt,
      redeemed_by: userId,
    })
    .eq('id', invite.id)
    .is('redeemed_at', null)
    .select('id')
    .maybeSingle()

  if (claimError) {
    return { error: projectMutationError('redeemProjectInviteClaim', claimError) }
  }

  if (!claimed) {
    return {
      error: 'Este convite já foi utilizado.',
      projectId: invite.project_id,
      alreadyMember: true,
    }
  }

  const { error: insertError } = await admin.from('project_collaborators').insert({
    project_id: invite.project_id,
    user_id: userId,
    role: invite.role as InviteRole,
  })

  if (insertError) {
    return { error: projectMutationError('redeemProjectInvite', insertError) }
  }

  return { projectId: project.id, projectTitle: project.title }
}