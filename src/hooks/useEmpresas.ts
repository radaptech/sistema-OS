import { useQuery } from '@tanstack/react-query'
import { servicoEmpresas } from '../servicos/servicoEmpresas'
import { TEMPO_CACHE_CADASTROS } from './tempoCache'

export function useEmpresas() {
  return useQuery({
    queryKey: ['empresas'],
    staleTime: TEMPO_CACHE_CADASTROS,
    queryFn: servicoEmpresas.listar,
  })
}
