'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Phone, X } from 'lucide-react'
import { saveOptionalPhone, type ProfileActionState } from '@/app/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const initialState: ProfileActionState = {}

type OptionalPhoneCardProps = {
  projectId: string
}

export function OptionalPhoneCard({ projectId }: OptionalPhoneCardProps) {
  const router = useRouter()
  const boundSave = saveOptionalPhone
  const [state, formAction, pending] = useActionState(boundSave, initialState)

  useEffect(() => {
    if (state.saved) {
      router.replace(`/projects/${projectId}`)
    }
  }, [state.saved, projectId, router])

  if (state.saved) {
    return null
  }

  return (
    <Card className="card-elevated border rounded-2xl border-brand/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Phone className="h-5 w-5 icon-brand" />
          Telefone (opcional)
        </CardTitle>
        <CardDescription>
          Ajude a família a te encontrar no WhatsApp. Você pode pular e adicionar depois no perfil.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <input type="hidden" name="projectId" value={projectId} />
          <div className="flex-1 space-y-2">
            <Label htmlFor="onboard-phone" className="sr-only">
              Telefone
            </Label>
            <Input
              id="onboard-phone"
              name="phone"
              type="tel"
              placeholder="+55 11 99999-9999"
              className="bg-card"
              disabled={pending}
            />
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending} className="btn-primary-gradient font-semibold">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.replace(`/projects/${projectId}`)}
              disabled={pending}
            >
              <X className="h-4 w-4 mr-1" />
              Pular
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}