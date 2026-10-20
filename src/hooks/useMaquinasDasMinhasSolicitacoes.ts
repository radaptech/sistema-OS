import { useQuery } from '@tanstack/react-query'
import { servicoSolicitacoes } from '../servicos/servicoSolicitacoes'

// Prefixo 'solicitacoes-os' de propósito: a mesma invalidação que atualiza Minhas
// Solicitações depois de uma solicitação nova traz a máquina dela para o filtro.
export function useMaquinasDasMinhasSolicitacoes() {
  return useQuery({
    queryKey: ['solicitacoes-os', 'maquinas'],
    queryFn: servicoSolicitacoes.listarMinhasMaquinas,
  })
}
