import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, Pencil, Settings } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { PhotoGallery } from '@/components/photos/photo-gallery'
import { PhotoUploadPanel } from '@/components/photos/photo-upload-panel'
import { ProjectPeoplePanel } from '@/components/invites/project-people-panel'
import { OptionalPhoneCard } from '@/components/profile/optional-phone-card'
import { listOwnerNetworkCollaborators } from '@/lib/collaborators/network-queries'
import { canManageInvites } from '@/lib/invites/permissions'
import { listProjectPeople } from '@/lib/invites/people-queries'
import { DeleteProjectButton } from '@/components/projects/delete-project-button'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { requireUser } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { getGalleryPhotos } from '@/lib/photos/queries'
import { canUploadPhotos } from '@/lib/photos/permissions'
import { roleLabel } from '@/lib/projects/labels'

import { getDisplayName, getProjectAccess } from '@/lib/projects/queries'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ onboard?: string }>
}

export default async function ProjectDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { onboard } = await searchParams
  const user = await requireUser()
  const [displayName, access] = await Promise.all([
    getDisplayName(user.id, user.email),
    getProjectAccess(id, user.id),
  ])

  if (!access) {
    notFound()
  }

  const { project, role, isOwner } = access
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const origin = host ? `${proto}://${host}` : undefined

  const showPeople = canManageInvites(access)
  const [photos, people, networkCollaborators, profileRow] = await Promise.all([
    getGalleryPhotos(project.id, { includeUnapproved: isOwner }),
    showPeople ? listProjectPeople(project.id, user.id, origin) : Promise.resolve([]),
    isOwner ? listOwnerNetworkCollaborators(user.id, project.id) : Promise.resolve([]),
    (async () => {
      const supabase = await createClient()
      const { data } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .maybeSingle()
      return data
    })(),
  ])
  const showOptionalPhone =
    onboard === 'contact' && !isOwner && !profileRow?.phone?.trim()
  const showUpload = canUploadPhotos(role)
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

  const createdLabel = format(new Date(project.created_at), "d 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  })

  return (
    <AppShell displayName={displayName}>
      <main className="page-container">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar aos projetos
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-muted text-muted-foreground border-0">
                {roleLabel(role)}
              </Badge>
              <span className="text-xs text-muted-foreground">Criado em {createdLabel}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl tracking-tighter font-semibold text-foreground">
              {project.title}
            </h1>
            {project.description ? (
              <p className="text-lg text-muted-foreground max-w-2xl">{project.description}</p>
            ) : (
              <p className="text-muted-foreground italic">Sem descrição</p>
            )}
          </div>

          {isOwner && (
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 shrink-0 w-full sm:w-auto">
              <Link
                href={`/projects/${project.id}/admin`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <Settings className="mr-2 h-4 w-4" />
                Admin
              </Link>
              <Link
                href={`/projects/${project.id}/edit`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Link>
              <DeleteProjectButton projectId={project.id} projectTitle={project.title} />
            </div>
          )}
        </div>

        {!hasServiceKey && photos.length > 0 && photos.every((p) => !p.signedUrl) && (
          <p className="mt-6 text-sm text-destructive rounded-lg bg-destructive/10 px-4 py-3 border border-destructive/20">
            Configure <code className="text-xs bg-card px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code>{' '}
            em <code className="text-xs bg-card px-1 rounded">.env.local</code> para exibir imagens do
            bucket privado (recomendado).
          </p>
        )}

        <section className="mt-10 space-y-8">
          {showOptionalPhone && <OptionalPhoneCard projectId={project.id} />}

          {showPeople && (
            <ProjectPeoplePanel
              projectId={project.id}
              people={people}
              hasServiceKey={hasServiceKey}
              isOwner={isOwner}
              networkCollaborators={networkCollaborators}
            />
          )}

          {showUpload && (
            <PhotoUploadPanel projectId={project.id} />
          )}

          <div>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">Galeria</h2>
            <PhotoGallery
              projectId={project.id}
              projectTitle={project.title}
              photos={photos}
              role={role}
              isOwner={isOwner}
              currentUserId={user.id}
              currentUserDisplayName={displayName}
            />
          </div>
        </section>
      </main>
    </AppShell>
  )
}