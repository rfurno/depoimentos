import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/server'
import { getGalleryPhotos } from '@/lib/photos/queries'
import { getDisplayName, getProjectAccess } from '@/lib/projects/queries'
import { parseUuid } from '@/lib/validation/uuid'
import { SlideshowPageClient } from './slideshow-page-client'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ photo?: string }>
}

export default async function ProjectSlideshowPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { photo: photoParam } = await searchParams
  const user = await requireUser()
  const [displayName, access] = await Promise.all([
    getDisplayName(user.id, user.email),
    getProjectAccess(id, user.id),
  ])

  if (!access) {
    notFound()
  }

  const { project, isOwner } = access
  const photos = await getGalleryPhotos(project.id, { includeUnapproved: isOwner })

  let initialIndex = 0
  if (photoParam && parseUuid(photoParam)) {
    const idx = photos.findIndex((p) => p.id === photoParam)
    if (idx >= 0) initialIndex = idx
  }

  const backHref = `/projects/${project.id}`

  return (
    <SlideshowPageClient
      photos={photos}
      initialIndex={initialIndex}
      projectId={project.id}
      projectTitle={project.title}
      currentUserDisplayName={displayName}
      backHref={backHref}
    />
  )
}