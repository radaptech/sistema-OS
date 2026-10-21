import { useQuery } from '@tanstack/react-query'
import { servicoSolicitacoes } from '../servicos/servicoSolicitacoes'

// Contadores exibidos na Home do Solicitante.
export function useResumoSolicitacoes() {
  return useQuery({
    queryKey: ['solicitacoes-resumo'],
    queryFn: servicoSolicitacoes.obterResumo,
  })
}
