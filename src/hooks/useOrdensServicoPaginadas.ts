import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  servicoOrdensServico,
  type ParametrosListagemPaginadaOS,
} from '../servicos/servicoOrdensServico'

// Chave dentro de 'ordens-servico-todas' de propósito: toda mutação que já invalida a
// lista inteira (lançar custo, encerrar...) atualiza as páginas junto. keepPreviousData
// segura a página atual na tela enquanto a próxima chega, em vez de piscar o skeleton.
export function useOrdensServicoPaginadas(parametros: ParametrosListagemPaginadaOS) {
  return useQuery({
    queryKey: ['ordens-servico-todas', 'paginada', parametros],
    queryFn: () => servicoOrdensServico.listarPaginada(parametros),
    placeholderData: keepPreviousData,
  })
}
