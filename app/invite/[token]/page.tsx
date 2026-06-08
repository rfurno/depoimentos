import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Users, Mail, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getInvitePreview } from '@/lib/invites/queries'
import { getProjectAccess } from '@/lib/projects/queries'
import { inviteRoleShortLabel } from '@/lib/invites/labels'
import { InviteAcceptForm } from '@/components/invites/invite-accept-form'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

function decodeQueryError(raw: string): string {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

type PageProps = {
  params: Promise<{ token: string }>
  searchParams: Promise<{ error?: string }>
}

export default async function InvitePage({ params, searchParams }: PageProps) {
  const { token } = await params
  const { error: inviteError } = await searchParams
  const preview = await getInvitePreview(token)

  if (!preview) {
    notFound()
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const invitePath = `/invite/${preview.token}`
  const loginHref = `/login?invite=${encodeURIComponent(preview.token)}`

  let statusMessage: string | null = null
  let statusVariant: 'muted' | 'error' = 'muted'
  let projectLinkId: string | null = null
  let loggedInAsOwner = false
  let alreadyMember = false
  let showAcceptForm = false

  if (preview.isExpired) {
    statusMessage = 'Este convite expirou. Peça um novo link ao proprietário do projeto.'
  } else if (preview.isRedeemed) {
    statusMessage = 'Este convite já foi utilizado.'
    projectLinkId = preview.projectId
  } else if (user) {
    const access = await getProjectAccess(preview.projectId, user.id)

    if (access?.isOwner) {
      loggedInAsOwner = true
      statusMessage =
        'Você está conectado como proprietário deste projeto. Convites são para outras pessoas — ' +
        'saia desta conta e entre com o e-mail do colaborador (ou use uma janela anônima).'
      statusVariant = 'error'
    } else if (access) {
      alreadyMember = true
      statusMessage = 'Você já participa deste projeto.'
      projectLinkId = preview.projectId
    } else {
      showAcceptForm = preview.canRedeem
    }
  }

  const expiresLabel = format(new Date(preview.expiresAt), "d 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  })

  const showLoginCta = !user && preview.canRedeem

  return (
    <div className="min-h-screen hero-gradient flex flex-col">
      <header className="border-b border-border/60 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto max-w-lg px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight text-xl text-foreground">
            Storyloom
          </Link>
          {user ? (
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
              Meus projetos
            </Link>
          ) : (
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Entrar
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <Card className="w-full max-w-md card-elevated border rounded-2xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Users className="h-7 w-7 icon-brand" />
            </div>
            <CardTitle className="text-2xl tracking-tight">Convite para colaborar</CardTitle>
            <CardDescription className="text-base pt-2 text-muted-foreground">
              Você foi convidado(a) para participar de
            </CardDescription>
            <p className="text-xl font-semibold text-foreground pt-1">{preview.projectTitle}</p>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="secondary" className="bg-muted text-muted-foreground border-0">
                {inviteRoleShortLabel(preview.role)}
              </Badge>
              <span className="text-xs text-muted-foreground self-center">Válido até {expiresLabel}</span>
            </div>

            {preview.email && (
              <p className="text-sm text-center text-muted-foreground flex items-center justify-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                Convite enviado para{' '}
                <span className="font-medium text-foreground">{preview.email}</span>
              </p>
            )}

            {inviteError && (
              <p className="text-sm rounded-lg px-4 py-3 border text-destructive bg-destructive/10 border-destructive/20">
                {decodeQueryError(inviteError)}
              </p>
            )}

            {statusMessage && (
              <p
                className={`text-sm rounded-lg px-4 py-3 border ${
                  statusVariant === 'error'
                    ? 'text-destructive bg-destructive/10 border-destructive/20'
                    : 'text-muted-foreground bg-muted border-border'
                }`}
              >
                {statusMessage}
              </p>
            )}

            {loggedInAsOwner && (
              <form
                action={`/auth/signout?redirectTo=${encodeURIComponent(invitePath)}`}
                method="post"
                className="pt-2"
              >
                <button
                  type="submit"
                  className={buttonVariants({
                    variant: 'outline',
                    className: 'w-full',
                  })}
                >
                  Sair e entrar com outro e-mail
                </button>
              </form>
            )}

            {showAcceptForm && <InviteAcceptForm token={token} />}

            {showLoginCta && (
              <div className="space-y-3 pt-2">
                <p className="text-sm text-center text-muted-foreground">
                  Entre com seu e-mail (link mágico, sem senha). Após clicar no link, você será
                  adicionado ao projeto automaticamente.
                </p>
                <Link
                  href={loginHref}
                  className={buttonVariants({
                    className:
                      'w-full h-12 btn-primary-gradient rounded-full font-semibold text-base',
                  })}
                >
                  Entrar e aceitar convite
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            )}

            {(projectLinkId || alreadyMember) && (
              <Link
                href={`/projects/${projectLinkId ?? preview.projectId}`}
                className={buttonVariants({ variant: 'outline', className: 'w-full' })}
              >
                Ir para o projeto
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            )}

            {!process.env.SUPABASE_SERVICE_ROLE_KEY && preview.canRedeem && (
              <p className="text-xs text-destructive text-center">
                Configure{' '}
                <code className="bg-card px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> em{' '}
                <code className="bg-card px-1 rounded">.env.local</code> para aceitar convites.
              </p>
            )}

            <div className="pt-2 text-center">
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
                Voltar à página inicial
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}