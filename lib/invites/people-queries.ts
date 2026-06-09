import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { buildInviteUrl } from '@/lib/invites/build-url'
import { canManageInvites } from '@/lib/invites/permissions'
import { getProjectAccess } from '@/lib/projects/queries'
import { formatPhoneHint } from '@/lib/validation/phone'
import { parseUuid } from '@/lib/validation/uuid'
import type { CollaboratorRole, InviteRole } from '@/lib/types'

export type PersonStatus = 'pending' | 'active' | 'expired' | 'used'

export type ProjectPersonRow = {
  id: string
  kind: 'invite' | 'member'
  label: string
  email: string | null
  phone: string | null
  phoneHint: string | null
  role: InviteRole | CollaboratorRole
  status: PersonStatus
  inviteUrl?: string
  userId?: string
  joinedAt?: string
  expiresAt?: string
}

function inviteLabel(row: {
  invitee_name: string | null
  email: string | null
  invitee_phone: string | null
}): string {
  if (row.invitee_name?.trim()) return row.invitee_name.trim()
  if (row.email?.trim()) return row.email.trim()
  if (row.invitee_phone?.trim()) return row.invitee_phone.trim()
  return 'Convite aberto'
}

function inviteStatus(row: {
  expires_at: string
  redeemed_at: string | null
}): PersonStatus {
  if (row.redeemed_at) return 'used'
  if (new Date(row.expires_at).getTime() < Date.now()) return 'expired'
  return 'pending'
}

async function memberEmails(userIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (userIds.length === 0) return map

  const admin = createAdminClient()
  if (!admin) return map

  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id)
      const email = data.user?.email
      if (email) map.set(id, email)
    })
  )

  return map
}

/** Unified roster: pending invites + active members (owner or project admin). */
export async function listProjectPeople(
  projectId: string,
  managerUserId: string,
  origin?: string
): Promise<ProjectPersonRow[]> {
  const id = parseUuid(projectId)
  if (!id) return []

  const access = await getProjectAccess(id, managerUserId)
  if (!access || !canManageInvites(access)) return []

  const supabase = await createClient()

  const [{ data: invites }, { data: members }] = await Promise.all([
    supabase
      .from('project_invites')
      .select(
        'id, token, invitee_name, invitee_phone, email, role, expires_at, redeemed_at, created_at'
      )
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('project_collaborators')
      .select('id, user_id, role, created_at, invite_id')
      .eq('project_id', id)
      .order('created_at', { ascending: true }),
  ])

  const memberIds = (members ?? []).map((m) => m.user_id)
  const emailByUser = await memberEmails(memberIds)

  let profiles: { id: string; full_name: string | null; phone: string | null }[] = []
  if (memberIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .in('id', memberIds)
    profiles = data ?? []
  }

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))

  const memberRows: ProjectPersonRow[] = (members ?? []).map((m) => {
    const profile = profileById.get(m.user_id)
    const email = emailByUser.get(m.user_id) ?? null
    const phone = profile?.phone?.trim() || null
    const label = profile?.full_name?.trim() || email || 'Familiar'

    return {
      id: m.id,
      kind: 'member',
      label,
      email,
      phone,
      phoneHint: phone ? formatPhoneHint(phone) : null,
      role: m.role as CollaboratorRole,
      status: 'active',
      userId: m.user_id,
      joinedAt: m.created_at,
    }
  })

  const inviteRows: ProjectPersonRow[] = (invites ?? []).map((row) => {
    const phone = row.invitee_phone?.trim() || null
    return {
      id: row.id,
      kind: 'invite',
      label: inviteLabel(row),
      email: row.email?.trim() || null,
      phone,
      phoneHint: phone ? formatPhoneHint(phone) : null,
      role: row.role as InviteRole,
      status: inviteStatus(row),
      inviteUrl: buildInviteUrl(row.token, origin),
      expiresAt: row.expires_at,
    }
  })

  const activeMembers = memberRows.filter((r) => r.status === 'active')
  const pendingInvites = inviteRows.filter((r) => r.status === 'pending')
  const closedInvites = inviteRows.filter((r) => r.status !== 'pending')

  return [...activeMembers, ...pendingInvites, ...closedInvites]
}