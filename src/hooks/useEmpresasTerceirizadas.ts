import { useQuery } from '@tanstack/react-query'
import { servicoEmpresasTerceirizadas } from '../servicos/servicoEmpresasTerceirizadas'
import { TEMPO_CACHE_CADASTROS } from './tempoCache'

export function useEmpresasTerceirizadas() {
  return useQuery({
    queryKey: ['empresas-terceirizadas'],
    staleTime: TEMPO_CACHE_CADASTROS,
    queryFn: servicoEmpresasTerceirizadas.listar,
  })
}
