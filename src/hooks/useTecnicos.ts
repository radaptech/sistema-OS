import { useQuery } from '@tanstack/react-query'
import { servicoTecnicos } from '../servicos/servicoTecnicos'
import { TEMPO_CACHE_CADASTROS } from './tempoCache'

export function useTecnicos(lojaId?: number) {
  return useQuery({
    queryKey: ['tecnicos', { lojaId }],
    staleTime: TEMPO_CACHE_CADASTROS,
    queryFn: () => servicoTecnicos.listar({ lojaId }),
  })
}
