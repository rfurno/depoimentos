'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import useEmblaCarousel from 'embla-carousel-react'
import { AnimatePresence, motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  MessageCircle,
  Pause,
  Play,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { fetchPhotoComments } from '@/app/actions/comments'
import type { CommentWithAuthor } from '@/lib/comments/queries'
import type { GalleryPhoto } from '@/lib/photos/queries'
import { SLIDESHOW_AUTO_ADVANCE_MS } from '@/lib/slideshow/constants'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export type PhotoSlideshowProps = {
  photos: GalleryPhoto[]
  initialIndex?: number
  projectId: string
  projectTitle: string
  currentUserDisplayName: string
  /** Overlay mode: mount in portal when open. Standalone: always visible (dedicated route). */
  mode?: 'overlay' | 'standalone'
  open?: boolean
  onClose: () => void
  backHref?: string
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0
  return Math.min(Math.max(0, index), length - 1)
}

function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

function SlideInfoPanel({
  photo,
  projectId,
  currentUserDisplayName,
}: {
  photo: GalleryPhoto
  projectId: string
  currentUserDisplayName: string
}) {
  const [comments, setComments] = useState<CommentWithAuthor[] | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchPhotoComments(projectId, photo.id, currentUserDisplayName).then((result) => {
      if (cancelled) return
      setComments(result.comments ?? [])
    })

    return () => {
      cancelled = true
    }
  }, [photo.id, projectId, currentUserDisplayName])

  const title = photo.title || photo.caption || 'Sem título'

  return (
    <div className="space-y-4 max-h-[40vh] overflow-y-auto overscroll-contain pr-1">
      <div>
        <h3 className="text-lg font-semibold text-white tracking-tight">{title}</h3>
        {photo.caption && photo.title && (
          <p className="text-sm text-white/80 mt-1">{photo.caption}</p>
        )}
        {photo.story && (
          <p className="text-sm text-white/90 mt-3 leading-relaxed whitespace-pre-wrap">
            {photo.story}
          </p>
        )}
        {!photo.caption && !photo.story && !photo.title && (
          <p className="text-sm text-white/60 italic mt-1">Sem legenda ou história</p>
        )}
      </div>

      <div className="border-t border-white/15 pt-3">
        <div className="flex items-center gap-2 text-white/90 text-sm font-medium mb-2">
          <MessageCircle className="h-4 w-4" />
          Comentários
          {comments != null && comments.length > 0 && (
            <span className="text-white/60 font-normal">({comments.length})</span>
          )}
        </div>
        {comments === null ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-white/50" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-white/60">Nenhum comentário nesta foto.</p>
        ) : (
          <ul className="space-y-2">
            {comments.map((c) => (
              <li key={c.id} className="rounded-lg bg-white/10 px-3 py-2">
                <p className="text-xs text-white/70">
                  {c.author_name} ·{' '}
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
                </p>
                <p className="text-sm text-white mt-0.5 whitespace-pre-wrap">{c.content}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-white/50 mt-3">
          Para comentar, feche a apresentação e abra a foto na galeria.
          {/* Future: inline audio comments (AudioComment) */}
        </p>
      </div>
    </div>
  )
}

export function PhotoSlideshow({
  photos,
  initialIndex = 0,
  projectId,
  projectTitle,
  currentUserDisplayName,
  mode = 'overlay',
  open = true,
  onClose,
  backHref,
}: PhotoSlideshowProps) {
  const isClient = useIsClient()
  const [selectedIndex, setSelectedIndex] = useState(() => clampIndex(initialIndex, photos.length))
  const [showInfo, setShowInfo] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(false)
  const autoPausedRef = useRef(false)

  const startIndex = clampIndex(initialIndex, photos.length)

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: photos.length > 1,
    align: 'center',
    duration: 28,
    watchDrag: true,
  })

  const isVisible = mode === 'standalone' || open

  useEffect(() => {
    if (!isVisible) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [isVisible])

  useEffect(() => {
    if (!emblaApi || !isVisible) return
    emblaApi.scrollTo(startIndex, true)
  }, [emblaApi, isVisible, startIndex])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
    autoPausedRef.current = true
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onSelect])

  useEffect(() => {
    if (!autoAdvance || !emblaApi || !isVisible || photos.length <= 1) return

    const id = window.setInterval(() => {
      if (autoPausedRef.current) {
        autoPausedRef.current = false
        return
      }
      if (showInfo) return
      emblaApi.scrollNext()
    }, SLIDESHOW_AUTO_ADVANCE_MS)

    return () => window.clearInterval(id)
  }, [autoAdvance, emblaApi, isVisible, photos.length, showInfo])

  useEffect(() => {
    if (!isVisible) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        emblaApi?.scrollPrev()
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        emblaApi?.scrollNext()
        return
      }
      if (e.key === ' ') {
        e.preventDefault()
        setShowInfo((v) => !v)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isVisible, emblaApi, onClose])

  const currentPhoto = photos[selectedIndex]

  if (photos.length === 0) {
    if (mode === 'standalone') {
      return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-story-dark text-white p-6">
          <p className="text-lg mb-4">Nenhuma foto para exibir na apresentação.</p>
          {backHref ? (
            <Link href={backHref} className="text-accent hover:underline text-sm">
              Voltar ao projeto
            </Link>
          ) : (
            <Button type="button" variant="outline" onClick={onClose}>
              Fechar
            </Button>
          )}
        </div>
      )
    }
    return null
  }

  if (!isVisible) return null

  const content = (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-story-dark text-white touch-pan-y"
      role="dialog"
      aria-modal="true"
      aria-label={`Apresentação: ${projectTitle}`}
    >
      <header className="relative z-20 flex items-center justify-between gap-3 px-4 py-3 sm:px-6 shrink-0 bg-gradient-to-b from-black/60 to-transparent">
        <div className="min-w-0">
          <p className="text-xs text-white/60 uppercase tracking-wide truncate">{projectTitle}</p>
          <p className="text-sm font-medium tabular-nums">
            {selectedIndex + 1} / {photos.length}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 mr-1">
            <Switch
              id="slideshow-auto"
              checked={autoAdvance}
              onCheckedChange={setAutoAdvance}
              aria-label="Avanço automático"
            />
            <Label htmlFor="slideshow-auto" className="text-xs text-white/80 cursor-pointer">
              Auto
            </Label>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-white hover:bg-white/15 sm:hidden"
            onClick={() => setAutoAdvance((v) => !v)}
            aria-label={autoAdvance ? 'Pausar avanço automático' : 'Ativar avanço automático'}
            aria-pressed={autoAdvance}
          >
            {autoAdvance ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-white hover:bg-white/15"
            onClick={() => setShowInfo((v) => !v)}
            aria-label={showInfo ? 'Ocultar informações' : 'Mostrar legenda e comentários'}
            aria-pressed={showInfo}
          >
            <Info className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-white hover:bg-white/15"
            onClick={onClose}
            aria-label="Fechar apresentação"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="relative flex-1 min-h-0 flex items-center">
        {photos.length > 1 && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute left-2 sm:left-4 z-20 h-12 w-12 rounded-full bg-black/40 text-white hover:bg-black/60 hidden sm:flex"
              onClick={() => emblaApi?.scrollPrev()}
              aria-label="Foto anterior"
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 sm:right-4 z-20 h-12 w-12 rounded-full bg-black/40 text-white hover:bg-black/60 hidden sm:flex"
              onClick={() => emblaApi?.scrollNext()}
              aria-label="Próxima foto"
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </>
        )}

        <div className="overflow-hidden h-full w-full" ref={emblaRef}>
          <div className="flex h-full touch-pan-y">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="flex-[0_0_100%] min-w-0 h-full flex items-center justify-center px-2 sm:px-12"
              >
                {photo.signedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.signedUrl}
                    alt={photo.title || photo.caption || 'Foto da família'}
                    className="max-h-full max-w-full object-contain select-none"
                    draggable={false}
                  />
                ) : (
                  <p className="text-white/60 text-sm">Imagem indisponível</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {!showInfo && currentPhoto && (
          <div className="absolute bottom-0 inset-x-0 z-10 pointer-events-none px-6 pb-6 pt-16 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-white font-medium text-lg line-clamp-2 drop-shadow-sm">
              {currentPhoto.title || currentPhoto.caption || 'Sem título'}
            </p>
            {currentPhoto.story && (
              <p className="text-white/75 text-sm line-clamp-2 mt-1">{currentPhoto.story}</p>
            )}
            <p className="text-white/50 text-xs mt-2">
              Espaço ou ícone de informações para legenda e comentários · Deslize para navegar
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showInfo && currentPhoto && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative z-30 shrink-0 border-t border-white/10 bg-foreground/95 backdrop-blur-md px-4 py-4 sm:px-6 max-h-[50vh]"
          >
            <SlideInfoPanel
              photo={currentPhoto}
              projectId={projectId}
              currentUserDisplayName={currentUserDisplayName}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {photos.length > 1 && photos.length <= 20 && (
        <div className="shrink-0 flex justify-center gap-1.5 px-4 py-3" aria-hidden>
          {photos.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`h-1.5 rounded-full transition-all ${
                i === selectedIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/35 hover:bg-white/55'
              }`}
              onClick={() => emblaApi?.scrollTo(i)}
              tabIndex={-1}
            />
          ))}
        </div>
      )}
    </div>
  )

  if (!isClient) return null

  if (mode === 'standalone' || (mode === 'overlay' && open)) {
    return createPortal(content, document.body)
  }

  return null
}