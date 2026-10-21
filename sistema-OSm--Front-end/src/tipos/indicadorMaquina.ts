import type { OrigemSolicitacao, TipoDefeito } from './ordemServico'

export interface IndicadorPorDefeito {
  tipoDefeito: TipoDefeito
  horasParada: number
}

// Cards e rosca do painel. Vem para o histórico inteiro (IndicadoresMaquina) e para
// cada mês (IndicadorMensal): clicar numa barra troca um pelo outro.
export interface ResumoIndicadores {
  // Quantas OS encerradas entraram na conta (no total ou no mês).
  quantidadeOs: number
  horasParadaTotal: number
  mttrHoras: number
  mtbfHoras: number
  custoTotal: number
  porTipoDefeito: IndicadorPorDefeito[]
  // Pequenos reparos, SEPARADOS de tudo acima: quantidadeOs/custoTotal/horas/MTBF/MTTR são do
  // maquinário, e o reparo (que não tem máquina) soma só aqui. A tela os mostra lado a lado e
  // nunca num número só. Preenchidos só na loja (total e setores) e nos meses dela; nas
  // máquinas vêm zerados.
  quantidadeReparos: number
  custoReparos: number
  // Manutenções preventivas, SEPARADAS do maquinário do mesmo jeito: a OS aberta pelo job de
  // preventiva soma só aqui, nunca em quantidadeOs/custoTotal/horas/rosca/MTBF/MTTR (o
  // maquinário fica sendo o que quebrou). Diferente do reparo, a preventiva tem máquina, então
  // vem preenchido também na máquina.
  quantidadePreventivas: number
  custoPreventivas: number
}

export interface IndicadorMensal extends ResumoIndicadores {
  mes: string
}

export interface IndicadoresMaquina extends ResumoIndicadores {
  maquinaId: number
  porMes: IndicadorMensal[]
}

// GET /indicadores/lojas/:id — a tela da loja no Painel de Indicadores: o total, um
// card por setor e um por máquina, todos recortados pelo escopo do Gestor (com só dois
// setores da loja, a "loja" é a soma desses dois). Setor e máquina trazem o próprio
// porMes porque o mês clicado no gráfico da loja filtra todos os cards da tela.
export interface IndicadorSetor extends ResumoIndicadores {
  setorId: number
  setorNome: string
  quantidadeMaquinas: number
  porMes: IndicadorMensal[]
}

export interface IndicadorMaquinaResumo extends ResumoIndicadores {
  maquinaId: number
  setorId: number
  porMes: IndicadorMensal[]
}

export interface IndicadoresLoja extends ResumoIndicadores {
  lojaId: number
  porMes: IndicadorMensal[]
  porSetor: IndicadorSetor[]
  porMaquina: IndicadorMaquinaResumo[]
}

// Os três grupos de custo do painel, cada um com a sua lista: o maquinário, os pequenos reparos
// (que não têm máquina) e as manutenções preventivas — os dois últimos SEPARADOS do primeiro.
export type GrupoOrdensDoPainel = 'maquinario' | 'reparos' | 'preventivas'

// Uma linha da lista por trás de um card de custo (GET /indicadores/lojas/:id/ordens): uma OS
// encerrada que compõe o número do card. `id` é o da OS — o detalhe abre a partir dele, e a soma
// de `custoTotal` dos itens é o número do card. No maquinário `item` é o nome da máquina e
// `codigo` o patrimônio; no reparo `item` é o que o Solicitante digitou e `codigo` é nulo.
export interface OrdemDoPainel {
  id: number
  item: string
  codigo: string | null
  maquinaId: number | null
  origem: OrigemSolicitacao
  descricao: string
  setorId: number
  setorNome: string
  tecnicoNome: string
  encerradaEm: string | null
  custoTotal: number
}
