import { api } from './api'
import { montarQuery } from './montarQuery'
import type {
  IndicadoresLoja,
  IndicadoresMaquina,
  GrupoOrdensDoPainel,
  OrdemDoPainel,
} from '../tipos/indicadorMaquina'
import type { RespostaPaginada } from '../tipos/paginacao'

// Qual card (grupo) e os recortes que o painel está mostrando: o setor escolhido, a máquina (maquinário
// e preventivas; reparo não tem) e o mês clicado no gráfico ("MM/YYYY", o mesmo rótulo). Sem eles, a loja inteira
// e o histórico inteiro.
export interface FiltrosOrdensDoPainel {
  grupo: GrupoOrdensDoPainel
  setorId?: number
  maquinaId?: number
  mes?: string
  pagina: number
}

export const servicoIndicadores = {
  obterPorMaquina: (maquinaId: number) =>
    api.get<IndicadoresMaquina>(`/indicadores/maquinas/${maquinaId}`),
  obterPorLoja: (lojaId: number) =>
    api.get<IndicadoresLoja>(`/indicadores/lojas/${lojaId}`),
  // A lista por trás de um card de custo (maquinário, preventivas ou pequenos reparos): mesma definição e mesmo
  // escopo do painel, então a soma dos itens é o número do card. 12 por página.
  listarOrdensDaLoja: (lojaId: number, filtros: FiltrosOrdensDoPainel) =>
    api.get<RespostaPaginada<OrdemDoPainel>>(
      `/indicadores/lojas/${lojaId}/ordens${montarQuery(filtros)}`,
    ),
}
