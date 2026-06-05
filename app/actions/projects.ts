'use server'

import { createClient } from '@/lib/supabase/server'
import { projectMutationError } from '@/lib/supabase/errors'
import { getProjectAccess } from '@/lib/projects/queries'
import { parseUuid } from '@/lib/validation/uuid'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const projectFieldsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'O título é obrigatório')
    .max(200, 'O título deve ter no máximo 200 caracteres'),
  description: z
    .string()
    .trim()
    .max(2000, 'A descrição deve ter no máximo 2000 caracteres')
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
})

export type ProjectActionState = {
  error?: string
  fieldErrors?: {
    title?: string[]
    description?: string[]
  }
}

function parseFormData(formData: FormData) {
  const rawDescription = formData.get('description')
  return projectFieldsSchema.safeParse({
    title: formData.get('title') ?? '',
    description: typeof rawDescription === 'string' ? rawDescription : '',
  })
}

export async function createProject(
  _prev: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  const parsed = parseFormData(formData)
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Você precisa estar conectado.' }
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      owner_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
    })
    .select('id')
    .single()

  if (error) {
    return { error: projectMutationError('createProject', error) }
  }

  revalidatePath('/dashboard')
  revalidatePath('/projects')
  redirect(`/projects/${data.id}`)
}

export async function updateProject(
  projectId: string,
  _prev: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  const id = parseUuid(projectId)
  if (!id) {
    return { error: 'Projeto inválido.' }
  }

  const parsed = parseFormData(formData)
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Você precisa estar conectado.' }
  }

  const access = await getProjectAccess(id, user.id)
  if (!access?.isOwner) {
    return { error: 'Apenas o proprietário pode editar este projeto.' }
  }

  const { error } = await supabase
    .from('projects')
    .update({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
    })
    .eq('id', id)

  if (error) {
    return { error: projectMutationError('updateProject', error) }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/projects/${id}`)
  redirect(`/projects/${id}`)
}

export async function deleteProject(projectId: string): Promise<ProjectActionState> {
  const id = parseUuid(projectId)
  if (!id) {
    return { error: 'Projeto inválido.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Você precisa estar conectado.' }
  }

  const access = await getProjectAccess(id, user.id)
  if (!access?.isOwner) {
    return { error: 'Apenas o proprietário pode excluir este projeto.' }
  }

  const { error } = await supabase.from('projects').delete().eq('id', id)

  if (error) {
    return { error: projectMutationError('deleteProject', error) }
  }

  revalidatePath('/dashboard')
  revalidatePath('/projects')
  redirect('/dashboard')
}