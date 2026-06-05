'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, MessageCircle, Pencil, Play, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  addComment,
  deleteComment,
  fetchPhotoComments,
  updateComment,
} from '@/app/actions/comments'
import { MAX_COMMENT_LENGTH } from '@/lib/comments/constants'
import type { CommentWithAuthor } from '@/lib/comments/queries'
import type { GalleryPhoto } from '@/lib/photos/queries'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

type PhotoDetailModalProps = {
  photo: GalleryPhoto | null
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  currentUserId: string
  currentUserDisplayName: string
  isOwner: boolean
  onOpenSlideshow?: () => void
}

function CommentItem({
  comment,
  isOwn,
  projectId,
  photoId,
  currentUserDisplayName,
  onCommentsChange,
}: {
  comment: CommentWithAuthor
  isOwn: boolean
  projectId: string
  photoId: string
  currentUserDisplayName: string
  onCommentsChange: (comments: CommentWithAuthor[]) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.content)
  const [isPending, startTransition] = useTransition()

  const timeAgo = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: true,
    locale: ptBR,
  })

  function handleSave() {
    startTransition(async () => {
      const result = await updateComment(
        projectId,
        photoId,
        comment.id,
        draft,
        currentUserDisplayName
      )
      if (result.error) {
        toast.error('Não foi possível salvar', { description: result.error })
        return
      }
      if (result.comments) onCommentsChange(result.comments)
      setEditing(false)
      toast.success('Comentário atualizado')
    })
  }

  function handleDelete() {
    if (!confirm('Excluir este comentário?')) return
    startTransition(async () => {
      const result = await deleteComment(
        projectId,
        photoId,
        comment.id,
        currentUserDisplayName
      )
      if (result.error) {
        toast.error('Não foi possível excluir', { description: result.error })
        return
      }
      if (result.comments) onCommentsChange(result.comments)
      toast.success('Comentário excluído')
    })
  }

  return (
    <li className="rounded-lg border border-[#d9d0c3] bg-[#faf8f5] p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-[#2c2522]">{comment.author_name}</p>
          <p className="text-xs text-[#6b6057]">{timeAgo}</p>
        </div>
        {isOwn && !editing && (
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="h-8 w-8 text-[#6b6057]"
              onClick={() => {
                setDraft(comment.content)
                setEditing(true)
              }}
              disabled={isPending}
              aria-label="Editar comentário"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="h-8 w-8 text-[#b85c38]"
              onClick={handleDelete}
              disabled={isPending}
              aria-label="Excluir comentário"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={MAX_COMMENT_LENGTH}
            rows={3}
            className="bg-white border-[#d9d0c3] resize-y min-h-[72px]"
            disabled={isPending}
          />
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDraft(comment.content)
                setEditing(false)
              }}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#2c2522] whitespace-pre-wrap leading-relaxed">
          {comment.content}
        </p>
      )}
    </li>
  )
}

export function PhotoDetailModal({
  photo,
  open,
  onOpenChange,
  projectId,
  currentUserId,
  currentUserDisplayName,
  isOwner,
  onOpenSlideshow,
}: PhotoDetailModalProps) {
  const router = useRouter()
  const [comments, setComments] = useState<CommentWithAuthor[] | null>(null)
  const [newComment, setNewComment] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open || !photo) return

    let cancelled = false

    fetchPhotoComments(projectId, photo.id, currentUserDisplayName).then((result) => {
      if (cancelled) return
      if (result.error) {
        toast.error('Não foi possível carregar comentários', { description: result.error })
        setComments([])
        return
      }
      setComments(result.comments ?? [])
    })

    return () => {
      cancelled = true
    }
  }, [open, photo, projectId, currentUserDisplayName])

  function handleOpenChange(next: boolean) {
    if (!next) {
      setComments(null)
      setNewComment('')
    }
    onOpenChange(next)
  }

  function handleCommentsChange(next: CommentWithAuthor[]) {
    setComments(next)
    router.refresh()
  }

  function handleAddComment() {
    if (!photo) return
    startTransition(async () => {
      const result = await addComment(
        projectId,
        photo.id,
        newComment,
        currentUserDisplayName
      )
      if (result.error) {
        toast.error('Não foi possível comentar', { description: result.error })
        return
      }
      if (result.comments) handleCommentsChange(result.comments)
      setNewComment('')
      toast.success('Comentário publicado')
    })
  }

  const title = photo?.title || photo?.caption || 'Foto da família'
  const createdLabel = photo
    ? format(new Date(photo.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
    : ''

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[min(92vh,900px)] overflow-y-auto p-0 gap-0 border-[#d9d0c3]"
        showCloseButton
      >
        {photo && (
          <>
            <div className="relative bg-[#e8e0d5]">
              {photo.signedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo.signedUrl}
                  alt={title}
                  className="w-full max-h-[50vh] object-contain"
                />
              ) : (
                <div className="flex h-48 items-center justify-center text-sm text-[#6b6057]">
                  Imagem indisponível
                </div>
              )}
              {!photo.is_approved && isOwner && (
                <Badge className="absolute top-3 left-3 bg-[#b85c38] text-white border-0">
                  Aguardando aprovação
                </Badge>
              )}
            </div>

            <div className="p-5 space-y-5">
              <DialogHeader className="text-left gap-1 p-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <DialogTitle className="text-2xl tracking-tight text-[#2c2522]">
                      {title}
                    </DialogTitle>
                    <DialogDescription className="text-[#6b6057]">
                      Adicionada em {createdLabel}
                    </DialogDescription>
                  </div>
                  {onOpenSlideshow && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-[#d9d0c3] shrink-0"
                      onClick={() => {
                        handleOpenChange(false)
                        onOpenSlideshow()
                      }}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Apresentação
                    </Button>
                  )}
                </div>
              </DialogHeader>

              {(photo.caption || photo.story) && (
                <div className="space-y-3 text-sm">
                  {photo.caption && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-[#6b6057] mb-1">
                        Legenda
                      </p>
                      <p className="text-[#2c2522] leading-relaxed">{photo.caption}</p>
                    </div>
                  )}
                  {photo.story && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-[#6b6057] mb-1">
                        História
                      </p>
                      <p className="text-[#2c2522] leading-relaxed whitespace-pre-wrap">
                        {photo.story}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <Separator className="bg-[#d9d0c3]" />

              <section className="space-y-4" aria-labelledby="comments-heading">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-[#8b5e3c]" />
                  <h2
                    id="comments-heading"
                    className="text-lg font-semibold tracking-tight text-[#2c2522]"
                  >
                    Comentários
                    {comments != null && comments.length > 0 && (
                      <span className="text-[#6b6057] font-normal ml-1">
                        ({comments.length})
                      </span>
                    )}
                  </h2>
                </div>

                {comments === null ? (
                  <div className="flex items-center justify-center py-8 text-[#6b6057]">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-[#6b6057] py-2">
                    Nenhum comentário ainda. Seja o primeiro a compartilhar uma memória sobre esta
                    foto.
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {comments.map((comment) => (
                      <CommentItem
                        key={comment.id}
                        comment={comment}
                        isOwn={comment.user_id === currentUserId}
                        projectId={projectId}
                        photoId={photo.id}
                        currentUserDisplayName={currentUserDisplayName}
                        onCommentsChange={handleCommentsChange}
                      />
                    ))}
                  </ul>
                )}

                <div className="space-y-2">
                  <Label htmlFor="new-comment" className="text-[#2c2522]">
                    Adicionar comentário
                  </Label>
                  <Textarea
                    id="new-comment"
                    placeholder="O que esta foto traz à mente?"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    maxLength={MAX_COMMENT_LENGTH}
                    rows={3}
                    className="bg-white border-[#d9d0c3] resize-y min-h-[80px]"
                    disabled={isPending}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[#6b6057]">
                      {newComment.length}/{MAX_COMMENT_LENGTH}
                    </span>
                    <Button
                      type="button"
                      onClick={handleAddComment}
                      disabled={isPending || !newComment.trim()}
                      className="bg-[#8b5e3c] hover:bg-[#6d4a2f] text-white"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Publicando…
                        </>
                      ) : (
                        'Publicar comentário'
                      )}
                    </Button>
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}