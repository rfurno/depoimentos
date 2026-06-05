'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Copy, Link2, Loader2, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import {
  createProjectInvite,
  revokeProjectInvite,
  type InviteActionState,
} from '@/app/actions/invites'
import { INVITE_DEFAULT_EXPIRY_DAYS, INVITE_EXPIRY_OPTIONS } from '@/lib/invites/constants'
import { inviteRoleLabel, inviteRoleShortLabel } from '@/lib/invites/labels'
import type { ProjectInviteRow } from '@/lib/invites/queries'
import type { InviteRole } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const initialState: InviteActionState = {}

const ROLES: InviteRole[] = ['contributor', 'viewer', 'admin']

type ProjectInvitesPanelProps = {
  projectId: string
  invites: ProjectInviteRow[]
  hasServiceKey: boolean
}

export function ProjectInvitesPanel({
  projectId,
  invites,
  hasServiceKey,
}: ProjectInvitesPanelProps) {
  const router = useRouter()
  const [role, setRole] = useState<InviteRole>('contributor')
  const [expiresInDays, setExpiresInDays] = useState(String(INVITE_DEFAULT_EXPIRY_DAYS))
  const [revokePending, startRevoke] = useTransition()
  const lastCopiedUrl = useRef<string | null>(null)

  const boundCreate = createProjectInvite.bind(null, projectId)
  const [state, formAction, pending] = useActionState(boundCreate, initialState)

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copiado!')
    } catch {
      toast.error('Não foi possível copiar', {
        description: 'Copie o link manualmente.',
      })
    }
  }

  useEffect(() => {
    if (state.inviteUrl && state.inviteUrl !== lastCopiedUrl.current) {
      lastCopiedUrl.current = state.inviteUrl
      void copyUrl(state.inviteUrl)
      router.refresh()
    }
  }, [state.inviteUrl, router])

  function handleRevoke(inviteId: string) {
    startRevoke(async () => {
      const result = await revokeProjectInvite(projectId, inviteId)
      if (result.error) {
        toast.error('Não foi possível revogar', { description: result.error })
        return
      }
      toast.success('Convite revogado')
      router.refresh()
    })
  }

  const activeInvites = invites.filter((i) => i.isActive)
  const pastInvites = invites.filter((i) => !i.isActive)

  return (
    <Card className="border-[#d9d0c3] shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl tracking-tight flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-[#8b5e3c]" />
          Convidar família
        </CardTitle>
        <CardDescription className="text-[#6b6057]">
          Gere um link seguro. Quem receber entra com link mágico e entra no projeto automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasServiceKey && (
          <p className="text-sm text-[#b85c38] rounded-lg bg-[#fdf2ef] px-4 py-3 border border-[#b85c38]/20">
            Configure <code className="text-xs bg-white px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code>{' '}
            para que convidados possam aceitar o convite após o login.
          </p>
        )}

        <form action={formAction} className="space-y-4 rounded-lg border border-[#d9d0c3] bg-[#faf8f5] p-4">
          {state.error && (
            <p className="text-sm text-[#b85c38] rounded-lg bg-[#fdf2ef] px-3 py-2 border border-[#b85c38]/20">
              {state.error}
            </p>
          )}
          {state.inviteUrl && (
            <p className="text-sm text-[#8b5e3c] rounded-lg bg-[#f0e9df] px-3 py-2">
              Novo link criado — copiado para a área de transferência.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="invite-role">Papel no projeto</Label>
              <input type="hidden" name="role" value={role} />
              <Select
                value={role}
                onValueChange={(v) => v && setRole(v as InviteRole)}
              >
                <SelectTrigger id="invite-role" className="w-full bg-white border-[#d9d0c3]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {inviteRoleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-email">E-mail (opcional)</Label>
              <Input
                id="invite-email"
                name="email"
                type="email"
                placeholder="tio@familia.com"
                className="bg-white border-[#d9d0c3]"
              />
              {state.fieldErrors?.email?.[0] && (
                <p className="text-sm text-[#b85c38]">{state.fieldErrors.email[0]}</p>
              )}
              <p className="text-xs text-[#6b6057]">Só uma dica na tela do convite — qualquer e-mail pode aceitar.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-expires">Validade</Label>
              <input type="hidden" name="expiresInDays" value={expiresInDays} />
              <Select
                value={expiresInDays}
                onValueChange={(v) => v && setExpiresInDays(v)}
              >
                <SelectTrigger id="invite-expires" className="w-full bg-white border-[#d9d0c3]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_EXPIRY_OPTIONS.map((days) => (
                    <SelectItem key={days} value={String(days)}>
                      {days} dias
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            type="submit"
            disabled={pending}
            className="rounded-full bg-[#8b5e3c] hover:bg-[#6f4a30]"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando link...
              </>
            ) : (
              <>
                <Link2 className="mr-2 h-4 w-4" />
                Gerar link de convite
              </>
            )}
          </Button>
        </form>

        {activeInvites.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[#2c2522]">Links ativos</h3>
            <ul className="space-y-2">
              {activeInvites.map((invite) => (
                <InviteListItem
                  key={invite.id}
                  invite={invite}
                  onCopy={() => copyUrl(invite.inviteUrl)}
                  onRevoke={() => handleRevoke(invite.id)}
                  revokeDisabled={revokePending}
                />
              ))}
            </ul>
          </div>
        )}

        {pastInvites.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[#6b6057]">Histórico</h3>
            <ul className="space-y-2 opacity-80">
              {pastInvites.map((invite) => (
                <InviteListItem key={invite.id} invite={invite} past />
              ))}
            </ul>
          </div>
        )}

        {invites.length === 0 && (
          <p className="text-sm text-[#6b6057] italic">
            Nenhum convite ainda. Gere um link e envie por WhatsApp ou e-mail.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function InviteListItem({
  invite,
  onCopy,
  onRevoke,
  revokeDisabled,
  past,
}: {
  invite: ProjectInviteRow
  onCopy?: () => void
  onRevoke?: () => void
  revokeDisabled?: boolean
  past?: boolean
}) {
  const expiresLabel = format(new Date(invite.expires_at), "d MMM yyyy", { locale: ptBR })
  const status = invite.redeemed_at
    ? 'Usado'
    : invite.isExpired
      ? 'Expirado'
      : 'Ativo'

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-[#d9d0c3] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="bg-[#f0e9df] text-[#6b6057] border-0 text-xs">
            {inviteRoleShortLabel(invite.role)}
          </Badge>
          <span className="text-xs text-[#6b6057]">{status} · até {expiresLabel}</span>
        </div>
        {invite.email && (
          <p className="text-xs text-[#6b6057] truncate">{invite.email}</p>
        )}
      </div>
      {!past && onCopy && onRevoke && (
        <div className="flex gap-2 shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={onCopy}>
            <Copy className="h-4 w-4 mr-1" />
            Copiar
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-[#b85c38] border-[#b85c38]/30 hover:bg-[#fdf2ef]"
            onClick={onRevoke}
            disabled={revokeDisabled}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </li>
  )
}