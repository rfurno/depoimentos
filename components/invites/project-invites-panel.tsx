'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Copy, Link2, Loader2, Mail, Trash2, UserPlus } from 'lucide-react'
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
import { EmptyState } from '@/components/ui/empty-state'

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
    <Card className="card-elevated border rounded-2xl">
      <CardHeader>
        <CardTitle className="text-xl tracking-tight flex items-center gap-2">
          <UserPlus className="h-5 w-5 icon-brand" />
          Convidar família
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Gere um link seguro. Quem receber entra com link mágico e entra no projeto automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasServiceKey && (
          <p className="text-sm text-destructive rounded-xl bg-destructive/10 px-4 py-3 border border-destructive/20">
            Configure <code className="text-xs bg-card px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code>{' '}
            para que convidados possam aceitar o convite após o login.
          </p>
        )}

        <form
          action={formAction}
          className="space-y-4 rounded-xl border border-border bg-muted p-4"
        >
          {state.error && (
            <p className="text-sm text-destructive rounded-xl bg-destructive/10 px-3 py-2 border border-destructive/20">
              {state.error}
            </p>
          )}
          {state.inviteUrl && (
            <p className="text-sm text-brand rounded-xl bg-card px-3 py-2 border border-brand/20 shadow-sm">
              Novo link criado — copiado para a área de transferência.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="invite-role">Papel no projeto</Label>
              <input type="hidden" name="role" value={role} />
              <Select value={role} onValueChange={(v) => v && setRole(v as InviteRole)}>
                <SelectTrigger id="invite-role" className="w-full bg-card border-border">
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
                className="bg-card border-border"
              />
              {state.fieldErrors?.email?.[0] && (
                <p className="text-sm text-destructive">{state.fieldErrors.email[0]}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Só uma dica na tela do convite — qualquer e-mail pode aceitar.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-expires">Validade</Label>
              <input type="hidden" name="expiresInDays" value={expiresInDays} />
              <Select value={expiresInDays} onValueChange={(v) => v && setExpiresInDays(v)}>
                <SelectTrigger id="invite-expires" className="w-full bg-card border-border">
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
            className="btn-primary-gradient rounded-full px-6 h-11 text-base font-semibold"
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
            <h3 className="text-sm font-medium text-foreground">Links ativos</h3>
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
            <h3 className="text-sm font-medium text-muted-foreground">Histórico</h3>
            <ul className="space-y-2 opacity-80">
              {pastInvites.map((invite) => (
                <InviteListItem key={invite.id} invite={invite} past />
              ))}
            </ul>
          </div>
        )}

        {invites.length === 0 && (
          <EmptyState
            icon={Mail}
            title="Nenhum convite ainda"
            description="Gere um link seguro acima e envie por WhatsApp, e-mail ou mensagem para parentes entrarem no projeto."
            compact
            className="border-dashed bg-muted/30 shadow-none"
          />
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
  const isActive = !invite.redeemed_at && !invite.isExpired
  const status = invite.redeemed_at ? 'Usado' : invite.isExpired ? 'Expirado' : 'Ativo'

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="bg-muted text-text-secondary border-0 text-xs">
            {inviteRoleShortLabel(invite.role)}
          </Badge>
          {isActive ? (
            <Badge className="badge-active text-xs">Ativo</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">{status}</span>
          )}
          <span className="text-xs text-muted-foreground">até {expiresLabel}</span>
        </div>
        {invite.email && (
          <p className="text-xs text-muted-foreground truncate">{invite.email}</p>
        )}
      </div>
      {!past && onCopy && onRevoke && (
        <div className="flex gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-brand/30 text-brand hover:bg-brand/5 hover:text-brand-dark"
            onClick={onCopy}
          >
            <Copy className="h-4 w-4 mr-1" />
            Copiar
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
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