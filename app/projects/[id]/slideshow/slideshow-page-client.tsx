'use client'

import { useRouter } from 'next/navigation'
import { PhotoSlideshow } from '@/components/photos/photo-slideshow'
import type { GalleryPhoto } from '@/lib/photos/queries'

type SlideshowPageClientProps = {
  photos: GalleryPhoto[]
  initialIndex: number
  projectId: string
  projectTitle: string
  currentUserDisplayName: string
  backHref: string
}

export function SlideshowPageClient({
  photos,
  initialIndex,
  projectId,
  projectTitle,
  currentUserDisplayName,
  backHref,
}: SlideshowPageClientProps) {
  const router = useRouter()

  return (
    <PhotoSlideshow
      mode="standalone"
      photos={photos}
      initialIndex={initialIndex}
      projectId={projectId}
      projectTitle={projectTitle}
      currentUserDisplayName={currentUserDisplayName}
      backHref={backHref}
      onClose={() => router.push(backHref)}
    />
  )
}