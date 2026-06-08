'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Upload, X, ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { uploadPhotos, type PhotoActionState } from '@/app/actions/photos'
import { MAX_PHOTOS_PER_UPLOAD } from '@/lib/photos/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const initialState: PhotoActionState = {}

type PendingFile = {
  id: string
  file: File
  preview: string
  title: string
  caption: string
  story: string
}

type PhotoUploadPanelProps = {
  projectId: string
}

export function PhotoUploadPanel({ projectId }: PhotoUploadPanelProps) {
  const router = useRouter()
  const [pending, setPending] = useState<PendingFile[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const lastUploadedRef = useRef(0)

  const boundUpload = uploadPhotos.bind(null, projectId)
  const [state, formAction, isUploading] = useActionState(boundUpload, initialState)

  useEffect(() => {
    if (state.uploaded && state.uploaded > 0 && state.uploaded !== lastUploadedRef.current) {
      lastUploadedRef.current = state.uploaded
      setPending((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.preview))
        return []
      })
      toast.success(
        state.uploaded === 1
          ? '1 foto adicionada à galeria'
          : `${state.uploaded} fotos adicionadas à galeria`
      )
      router.refresh()
    }
  }, [state.uploaded, router])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length === 0) return

    const room = MAX_PHOTOS_PER_UPLOAD - pending.length
    const slice = selected.slice(0, room)
    if (selected.length > room) {
      toast.warning(`Máximo de ${MAX_PHOTOS_PER_UPLOAD} fotos por envio`)
    }

    const next: PendingFile[] = slice.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      title: '',
      caption: '',
      story: '',
    }))
    setPending((prev) => [...prev, ...next])
    e.target.value = ''
  }

  function removePending(id: string) {
    setPending((prev) => {
      const item = prev.find((p) => p.id === id)
      if (item) URL.revokeObjectURL(item.preview)
      return prev.filter((p) => p.id !== id)
    })
  }

  function updatePending(
    id: string,
    field: keyof Omit<PendingFile, 'id' | 'file' | 'preview'>,
    value: string
  ) {
    setPending((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  function submitPhotos(formData: FormData) {
    pending.forEach((p) => formData.append('files', p.file))
    formData.set(
      'metadata',
      JSON.stringify(
        pending.map((p) => ({
          title: p.title || undefined,
          caption: p.caption || undefined,
          story: p.story || undefined,
        }))
      )
    )
    formAction(formData)
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl tracking-tight flex items-center gap-2">
          <ImagePlus className="h-5 w-5 text-primary" />
          Adicionar fotos
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Envie uma ou várias imagens. Título, legenda e história são opcionais para cada foto.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.error && (
          <p className="text-sm text-destructive rounded-lg bg-destructive/10 px-3 py-2 border border-destructive/20">
            {state.error}
          </p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />

        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed border-border h-12"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading || pending.length >= MAX_PHOTOS_PER_UPLOAD}
        >
          <Upload className="mr-2 h-4 w-4" />
          Escolher imagens
        </Button>

        {pending.length > 0 && (
          <form action={submitPhotos} className="space-y-4">
            <ul className="space-y-4 max-h-[28rem] overflow-y-auto pr-1">
              {pending.map((item, index) => (
                <li
                  key={item.id}
                  className="flex gap-4 rounded-xl border border-border bg-background p-3"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- blob preview */}
                  <img
                    src={item.preview}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-lg object-cover bg-muted"
                  />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground truncate">
                        Foto {index + 1}: {item.file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePending(item.id)}
                        className="text-muted-foreground hover:text-destructive p-1"
                        aria-label="Remover"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs">Título</Label>
                        <Input
                          value={item.title}
                          onChange={(e) => updatePending(item.id, 'title', e.target.value)}
                          placeholder="Opcional"
                          className="h-8 text-sm bg-card"
                          maxLength={200}
                          disabled={isUploading}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Legenda</Label>
                        <Input
                          value={item.caption}
                          onChange={(e) => updatePending(item.id, 'caption', e.target.value)}
                          placeholder="Opcional"
                          className="h-8 text-sm bg-card"
                          maxLength={500}
                          disabled={isUploading}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">História pessoal</Label>
                      <Textarea
                        value={item.story}
                        onChange={(e) => updatePending(item.id, 'story', e.target.value)}
                        placeholder="O que esta foto significa para você?"
                        className="min-h-[60px] text-sm bg-card resize-y"
                        maxLength={5000}
                        disabled={isUploading}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <Button
              type="submit"
              disabled={isUploading}
              className="w-full rounded-full bg-primary hover:bg-primary-dark text-white"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando {pending.length} foto{pending.length !== 1 ? 's' : ''}...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar {pending.length} foto{pending.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}