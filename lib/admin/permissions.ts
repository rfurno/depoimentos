import type { ProjectAccess } from '@/lib/projects/queries'

export function requireProjectOwner(access: ProjectAccess | null): access is ProjectAccess & {
  isOwner: true
} {
  return Boolean(access?.isOwner)
}