'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Copy,
  Link2,
  Loader2,
  Mail,
  Phone,
  Send,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  createProjectInvite,
  resendMemberLoginLink,
  revokeProjectInvite,
  type InviteActionState,
} from '@/app/actions/invites'
import { INVITE_DEFAULT_EXPIRY_DAYS, INVITE_EXPIRY_OPTIONS } from '@/lib/invites/constants'
import { inviteRoleLabel, inviteRoleShortLabel } from '@/lib/invites/labels'
import { roleLabel } from '@/lib/projects/labels'
import type { ProjectPersonRow } from '@/lib/invites/people-queries'
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

const STATUS_LABEL: Record<ProjectPersonRow['status'], string> = {
  pending: 'Pendente',
  active: 'Ativo',
  expired: 'Expirado',
  used: 'Aceito',
}

type ProjectPeoplePanelProps = {
  projectId: string
  people: ProjectPersonRow[]
  hasServiceKey: boolean
}

export function ProjectPeoplePanel({
  projectId,
  people,
  hasServiceKey,
}: ProjectPeoplePanelProps) {
  const router = useRouter()
  const [role, setRole] = useState<InviteRole>('contributor')
  const [expiresInDays, setExpiresInDays] = useState(String(INVITE_DEFAULT_EXPIRY_DAYS))
  const [revokePending, startRevoke] = useTransition()
  const [resendPending, startResend] = useTransition()
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

  function handleResendLogin(userId: string, label: string) {
    startResend(async () => {
      const result = await resendMemberLoginLink(projectId, userId)
      if (result.error) {
        toast.error('Não foi possível reenviar', { description: result.error })
        return
      }
      toast.success('Link de entrada enviado', {
        description: `Um link mágico foi enviado para o e-mail de ${label}.`,
      })
    })
  }

  return (
    <Card className="card-elevated border rounded-2xl">
      <CardHeader>
        <CardTitle className="text-xl tracking-tight flex items-center gap-2">
          <Users className="h-5 w-5 icon-brand" />
          Pessoas do projeto
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Convide família, acompanhe quem aceitou e reenvie link de entrada para quem já está ativo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasServiceKey && (
          <p className="text-sm text-destructive rounded-xl bg-destructive/10 px-4 py-3 border border-destructive/20">
            Configure <code className="text-xs bg-card px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code>{' '}
            para aceitar convites e reenviar links de entrada.
          </p>
        )}

        <form
          action={formAction}
          className="space-y-4 rounded-xl border border-border bg-muted p-4"
        >
          <h3 className="text-sm font-medium flex items-center gap-2">
            <UserPlus className="h-4 w-4 icon-brand" />
            Novo convite
          </h3>

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
              <Label htmlFor="invitee-name">Nome (opcional)</Label>
              <Input
                id="invitee-name"
                name="inviteeName"
                placeholder="Tio João"
                className="bg-card border-border"
                maxLength={120}
              />
              <p className="text-xs text-muted-foreground">Só para você identificar na lista.</p>
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
                Se preenchido, só este e-mail poderá aceitar o convite.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-phone">Telefone (opcional)</Label>
              <Input
                id="invite-phone"
                name="inviteePhone"
                type="tel"
                placeholder="+55 11 99999-9999"
                className="bg-card border-border"
              />
              {state.fieldErrors?.inviteePhone?.[0] && (
                <p className="text-sm text-destructive">{state.fieldErrors.inviteePhone[0]}</p>
              )}
              <p className="text-xs text-muted-foreground">Anotação sua — não restringe o aceite.</p>
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

        {people.length > 0 ? (
          <ul className="space-y-2">
            {people.map((person) => (
              <PersonRow
                key={`${person.kind}-${person.id}`}
                person={person}
                onCopy={person.inviteUrl ? () => copyUrl(person.inviteUrl!) : undefined}
                onRevoke={
                  person.kind === 'invite' && person.status === 'pending'
                    ? () => handleRevoke(person.id)
                    : undefined
                }
                onResendLogin={
                  person.kind === 'member' && person.userId
                    ? () => handleResendLogin(person.userId!, person.label)
                    : undefined
                }
                revokeDisabled={revokePending}
                resendDisabled={resendPending}
              />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Mail}
            title="Nenhuma pessoa ainda"
            description="Gere um convite acima. Quem aceitar aparecerá aqui como Ativo."
            compact
            className="border-dashed bg-muted/30 shadow-none"
          />
        )}
      </CardContent>
    </Card>
  )
}

function PersonRow({
  person,
  onCopy,
  onRevoke,
  onResendLogin,
  revokeDisabled,
  resendDisabled,
}: {
  person: ProjectPersonRow
  onCopy?: () => void
  onRevoke?: () => void
  onResendLogin?: () => void
  revokeDisabled?: boolean
  resendDisabled?: boolean
}) {
  const statusClass =
    person.status === 'active'
      ? 'badge-active'
      : person.status === 'pending'
        ? 'bg-brand/10 text-brand border-brand/20'
        : 'bg-muted text-muted-foreground border-0'

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm text-foreground truncate">{person.label}</span>
          <Badge variant="secondary" className="bg-muted text-text-secondary border-0 text-xs">
            {person.kind === 'member'
              ? roleLabel(person.role as InviteRole)
              : inviteRoleShortLabel(person.role as InviteRole)}
          </Badge>
          <Badge className={`text-xs ${statusClass}`}>{STATUS_LABEL[person.status]}</Badge>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {person.email && (
            <span className="inline-flex items-center gap-1 truncate max-w-full">
              <Mail className="h-3 w-3 shrink-0" />
              {person.email}
            </span>
          )}
          {(person.phoneHint || person.phone) && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3 shrink-0" />
              {person.kind === 'member' ? person.phoneHint : person.phone}
            </span>
          )}
          {person.kind === 'invite' && person.expiresAt && person.status === 'pending' && (
            <span>
              até {format(new Date(person.expiresAt), 'd MMM yyyy', { locale: ptBR })}
            </span>
          )}
          {person.kind === 'member' && person.joinedAt && (
            <span>
              desde {format(new Date(person.joinedAt), 'd MMM yyyy', { locale: ptBR })}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2 shrink-0">
        {onResendLogin && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-border"
            onClick={onResendLogin}
            disabled={resendDisabled}
          >
            <Send className="h-4 w-4 mr-1" />
            Reenviar entrada
          </Button>
        )}
        {onCopy && onRevoke && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-brand/30 text-brand hover:bg-brand/5"
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
          </>
        )}
      </div>
    </li>
  )
}