import { useQuery } from '@tanstack/react-query'
import { servicoSetores } from '../servicos/servicoSetores'
import { TEMPO_CACHE_CADASTROS } from './tempoCache'

export function useSetores(lojaId?: number) {
  return useQuery({
    queryKey: ['setores', { lojaId }],
    staleTime: TEMPO_CACHE_CADASTROS,
    queryFn: () => servicoSetores.listar({ lojaId }),
  })
}
