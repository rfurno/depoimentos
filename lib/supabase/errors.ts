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

  // Missing column / PostgREST schema cache (e.g. multi_use not migrated yet)
  const msg = error.message ?? ''
  if (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    /column .* does not exist/i.test(msg) ||
    /could not find the ['"].*['"] column/i.test(msg)
  ) {
    if (/multi_use/i.test(msg)) {
      return (
        'O banco ainda não tem o suporte a links em grupo. ' +
        'No Supabase → SQL Editor, execute o arquivo supabase/multi-use-invites.sql do repositório.'
      )
    }
    return (
      'Coluna ausente no banco (schema desatualizado). ' +
      'Execute os scripts SQL em supabase/ no Supabase SQL Editor (veja README).'
    )
  }

  if (
    error.code === '22003' ||
    msg.includes('integer out of range') ||
    msg.includes('out of range for type integer')
  ) {
    return 'Erro interno ao ordenar a foto. Atualize o app e tente novamente.'
  }

  if (process.env.NODE_ENV === 'development') {
    return `Erro (${error.code ?? 'unknown'}): ${error.message}`
  }

  return 'Não foi possível concluir a operação. Tente novamente.'
}