import { useQuery } from '@tanstack/react-query'
import { servicoOrdensServico } from '../servicos/servicoOrdensServico'

// Só busca quando a linha do tempo é aberta (`habilitado`): é leitura de auditoria, não do
// que a tela precisa para abrir. `staleTime: 0` porque um passo novo (uma correção de custo
// feita agora) tem que aparecer na próxima abertura.
export function useHistoricoOrdemServico(ordemServicoId: number, habilitado: boolean) {
  return useQuery({
    queryKey: ['historico-os', ordemServicoId],
    queryFn: () => servicoOrdensServico.listarHistorico(ordemServicoId),
    enabled: habilitado,
    staleTime: 0,
  })
}
