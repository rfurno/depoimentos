'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deletePhoto } from '@/app/actions/photos'
import { Button } from '@/components/ui/button'

type DeletePhotoButtonProps = {
  projectId: string
  photoId: string
}

export function DeletePhotoButton({ projectId, photoId }: DeletePhotoButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('Excluir esta foto permanentemente?')) return

    startTransition(async () => {
      const result = await deletePhoto(projectId, photoId)
      if (result.error) {
        toast.error('Não foi possível excluir', { description: result.error })
        return
      }
      toast.success('Foto excluída')
      router.refresh()
    })
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="h-8 w-8 text-white/90 hover:text-white hover:bg-black/40"
      onClick={handleDelete}
      disabled={isPending}
      aria-label="Excluir foto"
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  )
}