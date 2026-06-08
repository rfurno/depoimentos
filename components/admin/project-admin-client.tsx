'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Loader2,
  MessageCircle,
  Shield,
  Trash2,
  UserMinus,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { saveAs } from 'file-saver'
import {
  deleteCommentAsOwner,
  removeCollaborator,
  setPhotoApproval,
  updateCollaboratorRole,
  updatePhotoMetadata,
} from '@/app/actions/admin'
import { deletePhoto } from '@/app/actions/photos'
import type { CollaboratorRow, ModerationComment } from '@/lib/admin/queries'
import type { GalleryPhoto } from '@/lib/photos/queries'
import { roleLabel } from '@/lib/projects/labels'
import type { CollaboratorRole } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const ROLES: CollaboratorRole[] = ['contributor', 'viewer', 'admin']

type ProjectAdminClientProps = {
  projectId: string
  photos: GalleryPhoto[]
  collaborators: CollaboratorRow[]
  comments: ModerationComment[]
  hasServiceKey: boolean
}

export function ProjectAdminClient({
  projectId,
  photos: initialPhotos,
  collaborators: initialCollaborators,
  comments: initialComments,
  hasServiceKey,
}: ProjectAdminClientProps) {
  const router = useRouter()
  const [photos, setPhotos] = useState(initialPhotos)
  const [collaborators, setCollaborators] = useState(initialCollaborators)
  const [comments, setComments] = useState(initialComments)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialPhotos.map((p) => p.id)))
  const [exporting, setExporting] = useState(false)
  const [isPending, startTransition] = useTransition()

  const pendingCount = useMemo(() => photos.filter((p) => !p.is_approved).length, [photos])

  const commentsByPhotoId = useMemo(() => {
    const map = new Map<string, ModerationComment[]>()
    for (const comment of comments) {
      const list = map.get(comment.photo_id) ?? []
      list.push(comment)
      map.set(comment.photo_id, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
    return map
  }, [comments])

  const totalComments = comments.length

  function refresh() {
    router.refresh()
  }

  function toggleSelected(photoId: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(photoId)
      else next.delete(photoId)
      return next
    })
  }

  function selectAll(checked: boolean) {
    setSelected(checked ? new Set(photos.map((p) => p.id)) : new Set())
  }

  async function handleExport() {
    if (selected.size === 0) {
      toast.error('Selecione pelo menos uma foto.')
      return
    }
    setExporting(true)
    try {
      const ids = [...selected].join(',')
      const res = await fetch(`/api/projects/${projectId}/export?photoIds=${encodeURIComponent(ids)}`)
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Falha na exportação.')
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition')
      const match = disposition?.match(/filename="([^"]+)"/)
      saveAs(blob, match?.[1] ?? `storyloom-export.zip`)
      toast.success('ZIP exportado!', {
        description: 'Inclui imagens, MEMORIES.md e memories.json.',
      })
    } catch (e) {
      toast.error('Não foi possível exportar', {
        description: e instanceof Error ? e.message : 'Erro desconhecido.',
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-10">
      <Card className="card-elevated border rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Shield className="h-5 w-5 icon-brand" />
            Exportar para história com IA
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Baixe um ZIP com imagens selecionadas + <code className="text-xs bg-muted px-1 rounded">MEMORIES.md</code>{' '}
            estruturado para colar no Grok ou outro assistente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasServiceKey && (
            <p className="text-sm text-destructive rounded-lg bg-destructive/10 px-4 py-3 border border-destructive/20">
              Configure <code className="text-xs bg-card px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> para
              incluir imagens no ZIP.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <Checkbox
                checked={selected.size === photos.length && photos.length > 0}
                onCheckedChange={(v) => selectAll(v === true)}
              />
              Selecionar todas ({photos.length})
            </label>
            <Button
              type="button"
              onClick={handleExport}
              disabled={exporting || selected.size === 0}
              className="btn-primary-gradient rounded-full font-semibold"
            >
              {exporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando ZIP...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar {selected.size} foto{selected.size === 1 ? '' : 's'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">Fotos e comentários</h2>
          <div className="flex flex-wrap gap-2">
            {pendingCount > 0 && (
              <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                {pendingCount} aguardando aprovação
              </Badge>
            )}
            {totalComments > 0 && (
              <Badge variant="secondary" className="bg-muted text-text-secondary border-0">
                {totalComments} comentário{totalComments === 1 ? '' : 's'}
              </Badge>
            )}
          </div>
        </div>
        <div className="space-y-4">
          {photos.map((photo) => (
            <PhotoAdminRow
              key={photo.id}
              photo={photo}
              projectId={projectId}
              comments={commentsByPhotoId.get(photo.id) ?? []}
              selected={selected.has(photo.id)}
              onSelect={(checked) => toggleSelected(photo.id, checked)}
              isPending={isPending}
              onUpdated={refresh}
              onLocalUpdate={(updated) =>
                setPhotos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
              }
              onRemoved={() => {
                setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
                setComments((prev) => prev.filter((c) => c.photo_id !== photo.id))
              }}
              onCommentRemoved={(commentId) => {
                setComments((prev) => prev.filter((c) => c.id !== commentId))
                setPhotos((prev) =>
                  prev.map((p) =>
                    p.id === photo.id
                      ? { ...p, comment_count: Math.max(0, p.comment_count - 1) }
                      : p
                  )
                )
              }}
            />
          ))}
          {photos.length === 0 && (
            <p className="text-sm text-muted-foreground italic">Nenhuma foto neste projeto.</p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Colaboradores</h2>
        <ul className="space-y-2">
          {collaborators.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <div>
                <p className="font-medium text-foreground">{c.display_name}</p>
                <p className="text-xs text-muted-foreground">
                  Desde {format(new Date(c.created_at), "d MMM yyyy", { locale: ptBR })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CollaboratorRoleSelect
                  projectId={projectId}
                  collaboratorId={c.id}
                  value={c.role}
                  disabled={isPending}
                  onChanged={(role) =>
                    setCollaborators((prev) =>
                      prev.map((row) => (row.id === c.id ? { ...row, role } : row))
                    )
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30"
                  disabled={isPending}
                  onClick={() => {
                    if (!confirm(`Remover ${c.display_name} do projeto?`)) return
                    startTransition(async () => {
                      const result = await removeCollaborator(projectId, c.id)
                      if (result.error) {
                        toast.error('Não foi possível remover', { description: result.error })
                        return
                      }
                      setCollaborators((prev) => prev.filter((row) => row.id !== c.id))
                      toast.success('Colaborador removido')
                    })
                  }}
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
          {collaborators.length === 0 && (
            <p className="text-sm text-muted-foreground italic">Nenhum colaborador ainda — use convites na página do projeto.</p>
          )}
        </ul>
      </section>

    </div>
  )
}

function CollaboratorRoleSelect({
  projectId,
  collaboratorId,
  value,
  disabled,
  onChanged,
}: {
  projectId: string
  collaboratorId: string
  value: CollaboratorRole
  disabled: boolean
  onChanged: (role: CollaboratorRole) => void
}) {
  const [, startTransition] = useTransition()

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (!v) return
        const role = v as CollaboratorRole
        startTransition(async () => {
          const result = await updateCollaboratorRole(projectId, collaboratorId, role)
          if (result.error) {
            toast.error('Não foi possível atualizar', { description: result.error })
            return
          }
          onChanged(role)
          toast.success('Papel atualizado')
        })
      }}
      disabled={disabled}
    >
      <SelectTrigger className="w-[160px] h-8 bg-card border-border text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {roleLabel(r)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function PhotoAdminRow({
  photo,
  projectId,
  comments,
  selected,
  onSelect,
  isPending,
  onUpdated,
  onLocalUpdate,
  onRemoved,
  onCommentRemoved,
}: {
  photo: GalleryPhoto
  projectId: string
  comments: ModerationComment[]
  selected: boolean
  onSelect: (checked: boolean) => void
  isPending: boolean
  onUpdated: () => void
  onLocalUpdate: (photo: GalleryPhoto) => void
  onRemoved: () => void
  onCommentRemoved: (commentId: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(comments.length > 0)
  const [title, setTitle] = useState(photo.title ?? '')
  const [caption, setCaption] = useState(photo.caption ?? '')
  const [story, setStory] = useState(photo.story ?? '')
  const [, startTransition] = useTransition()

  function toggleApproval(approve: boolean) {
    startTransition(async () => {
      const result = await setPhotoApproval(projectId, photo.id, approve)
      if (result.error) {
        toast.error('Não foi possível atualizar', { description: result.error })
        return
      }
      onLocalUpdate({ ...photo, is_approved: approve })
      onUpdated()
      toast.success(approve ? 'Foto aprovada' : 'Foto ocultada da galeria')
    })
  }

  function saveMetadata() {
    startTransition(async () => {
      const result = await updatePhotoMetadata(projectId, photo.id, { title, caption, story })
      if (result.error) {
        toast.error('Não foi possível salvar', { description: result.error })
        return
      }
      onLocalUpdate({
        ...photo,
        title: title.trim() || null,
        caption: caption.trim() || null,
        story: story.trim() || null,
      })
      setEditing(false)
      onUpdated()
      toast.success('Metadados atualizados')
    })
  }

  function handleDelete() {
    if (!confirm('Excluir esta foto permanentemente?')) return
    startTransition(async () => {
      const result = await deletePhoto(projectId, photo.id)
      if (result.error) {
        toast.error('Não foi possível excluir', { description: result.error })
        return
      }
      onRemoved()
      onUpdated()
      toast.success('Foto excluída')
    })
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-4 p-4">
        <div className="flex items-start gap-3 shrink-0">
          <Checkbox checked={selected} onCheckedChange={(v) => onSelect(v === true)} />
          <div className="relative h-20 w-20 rounded-md overflow-hidden bg-muted">
            {photo.signedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.signedUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                sem img
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground truncate">
              {photo.title?.trim() || 'Sem título'}
            </p>
            {!photo.is_approved && (
              <Badge className="bg-destructive/10 text-destructive border-0">Pendente</Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {photo.comment_count} comentário{photo.comment_count === 1 ? '' : 's'}
            </span>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor={`title-${photo.id}`}>Título</Label>
                <Input
                  id={`title-${photo.id}`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-card border-border"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`caption-${photo.id}`}>Legenda</Label>
                <Input
                  id={`caption-${photo.id}`}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="bg-card border-border"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`story-${photo.id}`}>História</Label>
                <Textarea
                  id={`story-${photo.id}`}
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  rows={3}
                  className="bg-card border-border"
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={saveMetadata} disabled={isPending}>
                  Salvar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <>
              {photo.caption && (
                <p className="text-sm text-muted-foreground line-clamp-2">{photo.caption}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
                  Editar texto
                </Button>
                {photo.is_approved ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-muted-foreground"
                    disabled={isPending}
                    onClick={() => toggleApproval(false)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Ocultar
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-brand hover:text-brand-dark"
                    disabled={isPending}
                    onClick={() => toggleApproval(true)}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Aprovar
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/30"
                  disabled={isPending}
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <PhotoCommentsPanel
        photoId={photo.id}
        projectId={projectId}
        comments={comments}
        isOpen={commentsOpen}
        onToggle={() => setCommentsOpen((open) => !open)}
        isPending={isPending}
        onCommentRemoved={onCommentRemoved}
      />
    </div>
  )
}

function PhotoCommentsPanel({
  photoId,
  projectId,
  comments,
  isOpen,
  onToggle,
  isPending,
  onCommentRemoved,
}: {
  photoId: string
  projectId: string
  comments: ModerationComment[]
  isOpen: boolean
  onToggle: () => void
  isPending: boolean
  onCommentRemoved: (commentId: string) => void
}) {
  const [, startTransition] = useTransition()

  function handleDelete(commentId: string) {
    if (!confirm('Excluir este comentário?')) return
    startTransition(async () => {
      const result = await deleteCommentAsOwner(projectId, commentId)
      if (result.error) {
        toast.error('Não foi possível excluir', { description: result.error })
        return
      }
      onCommentRemoved(commentId)
      toast.success('Comentário removido')
    })
  }

  return (
    <div className="border-t border-border bg-muted/40">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
        aria-expanded={isOpen}
        aria-controls={`photo-comments-${photoId}`}
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-brand" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-brand" />
        )}
        <MessageCircle className="h-4 w-4 shrink-0 icon-brand" />
        <span>
          {comments.length === 0
            ? 'Nenhum comentário nesta foto'
            : `${comments.length} comentário${comments.length === 1 ? '' : 's'}`}
        </span>
      </button>

      {isOpen && comments.length > 0 && (
        <ul id={`photo-comments-${photoId}`} className="space-y-0 border-t border-border/60">
          {comments.map((comment, index) => (
            <li
              key={comment.id}
              className={`flex gap-3 px-4 py-3 ${
                index < comments.length - 1 ? 'border-b border-border/60' : ''
              }`}
            >
              <div
                className="mt-1.5 h-full w-0.5 shrink-0 rounded-full bg-brand/40"
                aria-hidden
              />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{comment.author_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), "d MMM yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 shrink-0 text-destructive hover:bg-destructive/10"
                    disabled={isPending}
                    onClick={() => handleDelete(comment.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remover
                  </Button>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {comment.content}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}