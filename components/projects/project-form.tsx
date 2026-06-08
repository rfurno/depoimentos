'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import {
  createProject,
  updateProject,
  type ProjectActionState,
} from '@/app/actions/projects'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const initialState: ProjectActionState = {}

type ProjectFormProps = {
  mode: 'create' | 'edit'
  projectId?: string
  defaultValues?: {
    title: string
    description: string
  }
}

export function ProjectForm({ mode, projectId, defaultValues }: ProjectFormProps) {
  const action =
    mode === 'create'
      ? createProject
      : updateProject.bind(null, projectId!)

  const [state, formAction, pending] = useActionState(action, initialState)

  const titleError = state.fieldErrors?.title?.[0]
  const descriptionError = state.fieldErrors?.description?.[0]

  return (
    <Card className="border-border shadow-sm max-w-lg w-full">
      <CardHeader>
        <CardTitle className="text-2xl tracking-tight">
          {mode === 'create' ? 'Novo projeto' : 'Editar projeto'}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {mode === 'create'
            ? 'Dê um nome à sua história familiar — aniversários, viagens, memórias.'
            : 'Atualize o título ou a descrição do projeto.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          {state.error && (
            <p className="text-sm text-destructive rounded-lg bg-destructive/10 px-3 py-2 border border-destructive/20">
              {state.error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              name="title"
              placeholder="ex: Aniversário da Maria 2026"
              defaultValue={defaultValues?.title ?? ''}
              className="h-11 bg-card border-border"
              required
              maxLength={200}
              disabled={pending}
            />
            {titleError && <p className="text-sm text-destructive">{titleError}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Uma frase sobre o que esta coleção representa para a família..."
              defaultValue={defaultValues?.description ?? ''}
              className="min-h-[120px] bg-card border-border resize-y"
              maxLength={2000}
              disabled={pending}
            />
            {descriptionError && (
              <p className="text-sm text-destructive">{descriptionError}</p>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <Link
              href={mode === 'create' ? '/dashboard' : `/projects/${projectId}`}
              className={buttonVariants({ variant: 'outline', className: 'sm:flex-1' })}
            >
              Cancelar
            </Link>
            <Button
              type="submit"
              disabled={pending}
              className="sm:flex-1 rounded-full bg-primary hover:bg-primary-dark text-white"
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : mode === 'create' ? (
                'Criar projeto'
              ) : (
                'Salvar alterações'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}