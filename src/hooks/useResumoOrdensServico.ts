import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  servicoOrdensServico,
  type ParametrosListagemOrdensServico,
} from '../servicos/servicoOrdensServico'

// Chave dentro de 'ordens-servico-todas' de propósito, como a da lista paginada: toda mutação
// que invalida a lista de OS atualiza as contagens dos cards junto — senão o card diria 40
// enquanto a lista, já refeita, mostra 41.
export function useResumoOrdensServico(
  parametros: ParametrosListagemOrdensServico,
  habilitado = true,
) {
  return useQuery({
    queryKey: ['ordens-servico-todas', 'resumo', parametros],
    queryFn: () => servicoOrdensServico.resumoPorSetor(parametros),
    enabled: habilitado,
    placeholderData: keepPreviousData,
  })
}
