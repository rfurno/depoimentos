import type { Role } from '@/lib/types'

const ROLE_LABELS: Record<Role, string> = {
  owner: 'Proprietário',
  contributor: 'Colaborador',
  viewer: 'Visualizador',
  admin: 'Administrador',
}

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role]
}