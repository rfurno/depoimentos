import { createClient } from '@/lib/supabase/server'
import { defaultDisplayNameFromEmail } from '@/lib/auth/display-name'
import { parseUuid } from '@/lib/validation/uuid'
import type { CollaboratorRole, Project, ProjectWithRole } from '@/lib/types'

type CollaboratorRow = {
  role: CollaboratorRole
  projects: Project | null
}

export async function getDisplayName(userId: string, fallbackEmail?: string): Promise<string> {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.full_name) return profile.full_name
  if (fallbackEmail) return defaultDisplayNameFromEmail(fallbackEmail)
  return 'você'
}

/** Projects owned by the user or where they are a collaborator. */
export async function getProjectsForUser(userId: string): Promise<ProjectWithRole[]> {
  const supabase = await createClient()

  const [{ data: owned }, { data: memberships }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, owner_id, title, description, created_at, updated_at')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('project_collaborators')
      .select('role, projects(id, owner_id, title, description, created_at, updated_at)')
      .eq('user_id', userId),
  ])

  const byId = new Map<string, ProjectWithRole>()

  for (const row of owned ?? []) {
    byId.set(row.id, { ...row, role: 'owner' })
  }

  for (const row of (memberships ?? []) as unknown as CollaboratorRow[]) {
    const project = row.projects
    if (!project || byId.has(project.id)) continue
    byId.set(project.id, { ...project, role: row.role })
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )
}

export type ProjectAccess = {
  project: Project
  role: ProjectWithRole['role']
  isOwner: boolean
}

/** Fetch one project if the user is owner or collaborator. */
export async function getProjectAccess(
  projectId: string,
  userId: string
): Promise<ProjectAccess | null> {
  const id = parseUuid(projectId)
  if (!id) return null

  const supabase = await createClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, owner_id, title, description, created_at, updated_at')
    .eq('id', id)
    .maybeSingle()

  if (error || !project) return null

  if (project.owner_id === userId) {
    return { project, role: 'owner', isOwner: true }
  }

  const { data: membership } = await supabase
    .from('project_collaborators')
    .select('role')
    .eq('project_id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!membership) return null

  return {
    project,
    role: membership.role as CollaboratorRole,
    isOwner: false,
  }
}