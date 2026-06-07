import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, Pencil, Settings } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { PhotoGallery } from '@/components/photos/photo-gallery'
import { PhotoUploadPanel } from '@/components/photos/photo-upload-panel'
import { ProjectInvitesPanel } from '@/components/invites/project-invites-panel'
import { DeleteProjectButton } from '@/components/projects/delete-project-button'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { requireUser } from '@/lib/auth/server'
import { getGalleryPhotos } from '@/lib/photos/queries'
import { canUploadPhotos } from '@/lib/photos/permissions'
import { roleLabel } from '@/lib/projects/labels'
import { listProjectInvites } from '@/lib/invites/queries'
import { getDisplayName, getProjectAccess } from '@/lib/projects/queries'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params
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

  const [photos, invites] = await Promise.all([
    getGalleryPhotos(project.id, { includeUnapproved: isOwner }),
    isOwner ? listProjectInvites(project.id, user.id, origin) : Promise.resolve([]),
  ])
  const showUpload = canUploadPhotos(role)
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

  const createdLabel = format(new Date(project.created_at), "d 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  })

  return (
    <AppShell displayName={displayName}>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-[#6b6057] hover:text-[#2c2522] mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar aos projetos
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-[#f0e9df] text-[#6b6057] border-0">
                {roleLabel(role)}
              </Badge>
              <span className="text-xs text-[#6b6057]">Criado em {createdLabel}</span>
            </div>
            <h1 className="text-4xl tracking-tighter font-semibold text-[#2c2522]">
              {project.title}
            </h1>
            {project.description ? (
              <p className="text-lg text-[#6b6057] max-w-2xl">{project.description}</p>
            ) : (
              <p className="text-[#6b6057] italic">Sem descrição</p>
            )}
          </div>

          {isOwner && (
            <div className="flex flex-wrap gap-2 shrink-0">
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
          <p className="mt-6 text-sm text-[#b85c38] rounded-lg bg-[#fdf2ef] px-4 py-3 border border-[#b85c38]/20">
            Configure <code className="text-xs bg-white px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code>{' '}
            em <code className="text-xs bg-white px-1 rounded">.env.local</code> para exibir imagens do
            bucket privado (recomendado).
          </p>
        )}

        <section className="mt-10 space-y-8">
          {isOwner && (
            <ProjectInvitesPanel
              projectId={project.id}
              invites={invites}
              hasServiceKey={hasServiceKey}
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