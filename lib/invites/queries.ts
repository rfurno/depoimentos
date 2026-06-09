import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildInviteUrl } from '@/lib/invites/build-url'
import { parseUuid } from '@/lib/validation/uuid'
import type { InviteRole, ProjectInvite } from '@/lib/types'

export type InvitePreview = {
  token: string
  projectId: string
  projectTitle: string
  role: InviteRole
  inviteeName: string | null
  email: string | null
  expiresAt: string
  isExpired: boolean
  isRedeemed: boolean
  canRedeem: boolean
}

export type ProjectInviteRow = ProjectInvite & {
  inviteUrl: string
  isExpired: boolean
  isActive: boolean
}

function inviteStatus(invite: { expires_at: string; redeemed_at: string | null }) {
  const isExpired = new Date(invite.expires_at).getTime() < Date.now()
  const isRedeemed = Boolean(invite.redeemed_at)
  return {
    isExpired,
    isRedeemed,
    isActive: !isExpired && !isRedeemed,
  }
}

/** Public invite landing — uses service role to read invite + project title safely by token. */
export async function getInvitePreview(token: string): Promise<InvitePreview | null> {
  const tokenUuid = parseUuid(token)
  if (!tokenUuid) return null

  const admin = createAdminClient()
  if (!admin) return null

  const { data: invite, error } = await admin
    .from('project_invites')
    .select('token, project_id, role, invitee_name, email, expires_at, redeemed_at')
    .eq('token', tokenUuid)
    .maybeSingle()

  if (error || !invite) return null

  const { data: project } = await admin
    .from('projects')
    .select('title')
    .eq('id', invite.project_id)
    .maybeSingle()

  if (!project?.title) return null

  const status = inviteStatus(invite)

  return {
    token: invite.token,
    projectId: invite.project_id,
    projectTitle: project.title,
    role: invite.role as InviteRole,
    inviteeName: invite.invitee_name,
    email: invite.email,
    expiresAt: invite.expires_at,
    isExpired: status.isExpired,
    isRedeemed: status.isRedeemed,
    canRedeem: status.isActive,
  }
}

/** Owner-only list of invites for a project. */
export async function listProjectInvites(
  projectId: string,
  ownerId: string,
  origin?: string
): Promise<ProjectInviteRow[]> {
  const id = parseUuid(projectId)
  if (!id) return []

  const supabase = await createClient()
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', id)
    .eq('owner_id', ownerId)
    .maybeSingle()

  if (!project) return []

  const { data: invites } = await supabase
    .from('project_invites')
    .select(
      'id, project_id, token, invitee_name, invitee_phone, email, role, expires_at, redeemed_at, redeemed_by, created_by, created_at'
    )
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  return (invites ?? []).map((row) => {
    const status = inviteStatus(row)
    return {
      ...row,
      role: row.role as InviteRole,
      inviteUrl: buildInviteUrl(row.token, origin),
      isExpired: status.isExpired,
      isActive: status.isActive,
    }
  })
}