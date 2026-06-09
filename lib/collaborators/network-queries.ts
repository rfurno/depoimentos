import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { parseUuid } from '@/lib/validation/uuid'

export type NetworkCollaboratorOption = {
  userId: string
  label: string
  email: string | null
}

async function resolveLabelsAndEmails(
  userIds: string[]
): Promise<Map<string, { label: string; email: string | null }>> {
  const map = new Map<string, { label: string; email: string | null }>()
  if (userIds.length === 0) return map

  const admin = createAdminClient()
  const supabase = await createClient()

  const client = admin ?? supabase
  const { data: profiles } = await client
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds)

  for (const row of profiles ?? []) {
    map.set(row.id, {
      label: row.full_name?.trim() || 'Familiar',
      email: null,
    })
  }

  if (admin) {
    await Promise.all(
      userIds.map(async (id) => {
        const { data } = await admin.auth.admin.getUserById(id)
        const email = data.user?.email ?? null
        const existing = map.get(id)
        map.set(id, {
          label: existing?.label || email || 'Familiar',
          email,
        })
        if (existing?.label === 'Familiar' && email) {
          map.set(id, { label: email, email })
        }
      })
    )
  }

  for (const id of userIds) {
    if (!map.has(id)) {
      map.set(id, { label: 'Familiar', email: null })
    }
  }

  return map
}

/**
 * Registered collaborators from any project the owner controls,
 * excluding people already on the target project.
 */
export async function listOwnerNetworkCollaborators(
  ownerId: string,
  targetProjectId: string
): Promise<NetworkCollaboratorOption[]> {
  const targetUuid = parseUuid(targetProjectId)
  if (!targetUuid) return []

  const supabase = await createClient()

  const { data: owned } = await supabase
    .from('projects')
    .select('id')
    .eq('owner_id', ownerId)

  const ownedIds = (owned ?? []).map((p) => p.id)
  if (ownedIds.length === 0) return []

  const { data: currentMembers } = await supabase
    .from('project_collaborators')
    .select('user_id')
    .eq('project_id', targetUuid)

  const exclude = new Set([ownerId, ...(currentMembers ?? []).map((m) => m.user_id)])

  const { data: rows } = await supabase
    .from('project_collaborators')
    .select('user_id')
    .in('project_id', ownedIds)

  const userIds = [...new Set((rows ?? []).map((r) => r.user_id))].filter((id) => !exclude.has(id))
  if (userIds.length === 0) return []

  const meta = await resolveLabelsAndEmails(userIds)

  return userIds
    .map((userId) => {
      const info = meta.get(userId)!
      return {
        userId,
        label: info.label,
        email: info.email,
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
}