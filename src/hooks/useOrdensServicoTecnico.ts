import { useQuery } from '@tanstack/react-query'
import { servicoOrdensServico } from '../servicos/servicoOrdensServico'

// O servidor restringe às OS do técnico autenticado — o id vai junto apenas para compor
// a chave de cache. `finalizada: false` deixa de fora o histórico (as concluídas, que só
// crescem): elas vêm paginadas do servidor na aba "OS Concluídas" (NavegacaoLojaSetorPaginada).
// Continuam aqui as que esvaziam com o fluxo: em aberto, pausadas, e a concluída que ainda
// espera o custo.
export function useOrdensServicoTecnico(tecnicoId: number | null) {
  return useQuery({
    queryKey: ['ordens-servico-tecnico', tecnicoId],
    queryFn: () => servicoOrdensServico.listar({ tecnicoId: tecnicoId as number, finalizada: false }),
    enabled: Boolean(tecnicoId),
  })
}
