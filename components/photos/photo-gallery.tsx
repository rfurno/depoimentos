'use client'

import { useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Images, MessageCircle, Play, Search } from 'lucide-react'
import Link from 'next/link'
import type { GalleryPhoto } from '@/lib/photos/queries'
import { canDeletePhoto } from '@/lib/photos/permissions'
import type { Role } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { DeletePhotoButton } from '@/components/photos/delete-photo-button'
import { PhotoDetailModal } from '@/components/photos/photo-detail-modal'
import { PhotoSlideshow } from '@/components/photos/photo-slideshow'
import { Button } from '@/components/ui/button'

type PhotoGalleryProps = {
  projectId: string
  projectTitle: string
  photos: GalleryPhoto[]
  role: Role
  isOwner: boolean
  currentUserId: string
  currentUserDisplayName: string
}

function matchesSearch(photo: GalleryPhoto, query: string): boolean {
  const q = query.toLowerCase().trim()
  if (!q) return true
  const blob = [photo.title, photo.caption, photo.story].filter(Boolean).join(' ').toLowerCase()
  return blob.includes(q)
}

export function PhotoGallery({
  projectId,
  projectTitle,
  photos,
  role,
  isOwner,
  currentUserId,
  currentUserDisplayName,
}: PhotoGalleryProps) {
  const [search, setSearch] = useState('')
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
  const [slideshowOpen, setSlideshowOpen] = useState(false)
  const [slideshowStartIndex, setSlideshowStartIndex] = useState(0)

  const filtered = useMemo(
    () => photos.filter((p) => matchesSearch(p, search)),
    [photos, search]
  )

  if (photos.length === 0) {
    return (
      <div className="rounded-2xl border border-[#d9d0c3] bg-white p-12 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0e9df]">
          <Images className="h-7 w-7 text-[#8b5e3c]" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight mb-2">Nenhuma foto ainda</h2>
        <p className="text-[#6b6057] max-w-md mx-auto text-sm">
          Adicione a primeira memória usando o painel acima. Toque em qualquer foto para ver
          detalhes e comentários da família.
        </p>
      </div>
    )
  }

  const selectedPhoto =
    selectedPhotoId != null ? photos.find((p) => p.id === selectedPhotoId) ?? null : null

  function openSlideshow(startPhotoId?: string) {
    const list = filtered
    if (list.length === 0) return
    const idx =
      startPhotoId != null ? list.findIndex((p) => p.id === startPhotoId) : 0
    setSlideshowStartIndex(idx >= 0 ? idx : 0)
    setSlideshowOpen(true)
    setSelectedPhotoId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b6057]" />
          <Input
            type="search"
            placeholder="Buscar por título, legenda ou história..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-[#d9d0c3] h-11"
            aria-label="Buscar fotos"
          />
        </div>
        {filtered.length > 0 && (
          <div className="flex gap-2 shrink-0">
            <Button
              type="button"
              className="bg-[#8b5e3c] hover:bg-[#6d4a2f] text-white"
              onClick={() => openSlideshow()}
            >
              <Play className="mr-2 h-4 w-4" />
              Apresentação
            </Button>
            <Link
              href={
                selectedPhotoId
                  ? `/projects/${projectId}/slideshow?photo=${selectedPhotoId}`
                  : `/projects/${projectId}/slideshow`
              }
              className="inline-flex h-7 items-center justify-center rounded-[min(var(--radius-md),12px)] border border-[#d9d0c3] bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
            >
              Tela cheia
            </Link>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-[#6b6057] py-8 text-center">Nenhuma foto corresponde à busca.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filtered.map((photo) => {
            const showDelete = canDeletePhoto(role, currentUserId, photo.uploaded_by, isOwner)
            const timeAgo = formatDistanceToNow(new Date(photo.created_at), {
              addSuffix: true,
              locale: ptBR,
            })

            return (
              <article
                key={photo.id}
                role="button"
                tabIndex={0}
                className="group relative rounded-xl overflow-hidden border border-[#d9d0c3] bg-[#e8e0d5] aspect-square cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5e3c] focus-visible:ring-offset-2"
                onClick={() => setSelectedPhotoId(photo.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedPhotoId(photo.id)
                  }
                }}
                aria-label={`Abrir detalhes: ${photo.title || photo.caption || 'foto'}`}
              >
                {photo.signedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- signed URLs expire; not compatible with next/image cache
                  <img
                    src={photo.signedUrl}
                    alt={photo.title || photo.caption || 'Foto da família'}
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs text-[#6b6057] p-4 text-center">
                    Imagem indisponível
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 pt-8">
                  <p className="text-white text-sm font-medium line-clamp-1">
                    {photo.title || photo.caption || 'Sem título'}
                  </p>
                  <p className="text-white/70 text-xs mt-0.5">{timeAgo}</p>
                </div>

                <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                  {!photo.is_approved && isOwner && (
                    <Badge className="bg-[#b85c38] text-white border-0 text-[10px]">
                      Pendente
                    </Badge>
                  )}
                  {(photo.comment_count ?? 0) > 0 && (
                    <Badge className="bg-black/50 text-white border-0 text-[10px] gap-0.5">
                      <MessageCircle className="h-3 w-3" />
                      {photo.comment_count}
                    </Badge>
                  )}
                </div>

                {showDelete && (
                  <div
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <DeletePhotoButton projectId={projectId} photoId={photo.id} />
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      <p className="text-xs text-[#6b6057] text-center">
        {filtered.length} de {photos.length} foto{photos.length !== 1 ? 's' : ''}
        {search.trim() ? ' (filtradas)' : ''}
        {' · '}
        Toque em uma foto para detalhes · use Apresentação para modo tela cheia
      </p>

      <PhotoSlideshow
        key={slideshowOpen ? `slideshow-${slideshowStartIndex}` : 'slideshow-closed'}
        mode="overlay"
        open={slideshowOpen}
        onClose={() => setSlideshowOpen(false)}
        photos={filtered}
        initialIndex={slideshowStartIndex}
        projectId={projectId}
        projectTitle={projectTitle}
        currentUserDisplayName={currentUserDisplayName}
      />

      <PhotoDetailModal
        key={selectedPhotoId ?? 'closed'}
        photo={selectedPhoto}
        open={selectedPhoto != null}
        onOpenChange={(open) => {
          if (!open) setSelectedPhotoId(null)
        }}
        projectId={projectId}
        currentUserId={currentUserId}
        currentUserDisplayName={currentUserDisplayName}
        isOwner={isOwner}
        onOpenSlideshow={
          selectedPhoto ? () => openSlideshow(selectedPhoto.id) : undefined
        }
      />
    </div>
  )
}