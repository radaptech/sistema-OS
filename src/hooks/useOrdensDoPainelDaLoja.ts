import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  servicoIndicadores,
  type FiltrosOrdensDoPainel,
} from '../servicos/servicoIndicadores'

// Só busca com o modal aberto (`habilitado`); keepPreviousData segura a página atual na tela
// enquanto a próxima chega, em vez de piscar o esqueleto.
export function useOrdensDoPainelDaLoja(
  lojaId: number,
  filtros: FiltrosOrdensDoPainel,
  habilitado: boolean,
) {
  return useQuery({
    queryKey: ['ordens-do-painel-da-loja', lojaId, filtros],
    queryFn: () => servicoIndicadores.listarOrdensDaLoja(lojaId, filtros),
    enabled: habilitado,
    placeholderData: keepPreviousData,
  })
}
