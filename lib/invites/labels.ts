import type { InviteRole } from '@/lib/types'

const INVITE_ROLE_LABELS: Record<InviteRole, string> = {
  contributor: 'Colaborador — pode enviar fotos e comentar',
  viewer: 'Visualizador — apenas ver fotos e comentários',
  admin: 'Administrador — pode moderar (fase futura)',
}

export function inviteRoleLabel(role: InviteRole): string {
  return INVITE_ROLE_LABELS[role]
}

export function inviteRoleShortLabel(role: InviteRole): string {
  const short: Record<InviteRole, string> = {
    contributor: 'Colaborador',
    viewer: 'Visualizador',
    admin: 'Administrador',
  }
  return short[role]
}