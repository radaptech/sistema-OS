import { converterDataBackend } from './dataBackend'
import type { IdUrgencia, OrdemServico } from '../tipos/ordemServico'

const PESO_URGENCIA: Record<IdUrgencia, number> = {
  Alta: 0,
  Média: 1,
  Baixa: 2,
}

const PESO_URGENCIA_AUSENTE = 3

// Ordem de prioridade para o Técnico decidir o que atacar primeiro:
// 1) Máquina Parada (afetaProducao) sempre vem antes de qualquer coisa — é prejuízo
//    acontecendo agora, independente da urgência marcada pelo Gestor.
// 2) Dentro do mesmo patamar (parada ou não), desempata por Urgência.
// 3) Por fim, a OS mais antiga primeiro — quem espera há mais tempo não deve ser
//    ultrapassado por um pedido que chegou depois com a mesma urgência.
export function ordenarPorPrioridade(ordens: OrdemServico[]): OrdemServico[] {
  return [...ordens].sort((a, b) => {
    if (a.afetaProducao !== b.afetaProducao) {
      return a.afetaProducao ? -1 : 1
    }

    const pesoA = a.urgencia ? PESO_URGENCIA[a.urgencia] : PESO_URGENCIA_AUSENTE
    const pesoB = b.urgencia ? PESO_URGENCIA[b.urgencia] : PESO_URGENCIA_AUSENTE

    if (pesoA !== pesoB) {
      return pesoA - pesoB
    }

    return (
      converterDataBackend(a.dataAbertura).getTime() -
      converterDataBackend(b.dataAbertura).getTime()
    )
  })
}
