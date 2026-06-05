import type { PostgrestError } from '@supabase/supabase-js'

/** User-safe message; logs details only in development. */
export function projectMutationError(
  context: string,
  error: PostgrestError | null
): string {
  if (process.env.NODE_ENV === 'development' && error) {
    console.error(`[${context}]`, error.code, error.message, error.details, error.hint)
  }

  if (!error) return 'Não foi possível concluir a operação. Tente novamente.'

  if (error.code === '42P17') {
    return (
      'Configuração do banco incorreta (políticas RLS em loop). ' +
      'No Supabase → SQL Editor, execute o arquivo supabase/fix-rls-recursion.sql do repositório.'
    )
  }

  if (error.code === '42501' || error.message?.includes('row-level security')) {
    return 'Sem permissão para esta ação. Verifique se você está conectado e tente novamente.'
  }

  if (error.code === '42P01' || error.message?.includes('does not exist')) {
    return 'Tabela do banco não encontrada. Execute o schema SQL completo no Supabase (veja README).'
  }

  return 'Não foi possível concluir a operação. Tente novamente.'
}