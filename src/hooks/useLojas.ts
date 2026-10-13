import { useQuery } from '@tanstack/react-query'
import { servicoLojas } from '../servicos/servicoLojas'
import { TEMPO_CACHE_CADASTROS } from './tempoCache'

export function useLojas() {
  return useQuery({
    queryKey: ['lojas'],
    staleTime: TEMPO_CACHE_CADASTROS,
    queryFn: servicoLojas.listar,
  })
}
