import { useQuery } from '@tanstack/react-query'
import { servicoOrdensServico } from '../servicos/servicoOrdensServico'
import type { ParametrosListagemOrdensServico } from '../servicos/servicoOrdensServico'

// `habilitado` deixa o Painel do Gestor buscar só a lista da aba aberta.
export function useOrdensServicoTodas(
  parametros: ParametrosListagemOrdensServico = {},
  habilitado = true,
) {
  return useQuery({
    queryKey: ['ordens-servico-todas', parametros],
    queryFn: () => servicoOrdensServico.listar(parametros),
    enabled: habilitado,
  })
}
