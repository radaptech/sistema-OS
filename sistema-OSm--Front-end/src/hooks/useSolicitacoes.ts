import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  servicoSolicitacoes,
  type ParametrosListagemSolicitacoes,
} from '../servicos/servicoSolicitacoes'

export function useSolicitacoes(parametros: ParametrosListagemSolicitacoes) {
  return useQuery({
    queryKey: ['solicitacoes-os', parametros],
    queryFn: () => servicoSolicitacoes.listar(parametros),
    placeholderData: keepPreviousData,
  })
}
