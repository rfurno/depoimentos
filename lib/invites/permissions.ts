import type { ProjectAccess } from '@/lib/projects/queries'

/** Owner or project admin may create/revoke invites and view the people roster. */
export function canManageInvites(access: ProjectAccess): boolean {
  return access.isOwner || access.role === 'admin'
}