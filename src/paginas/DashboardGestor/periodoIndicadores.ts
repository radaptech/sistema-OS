import { formatarMoeda } from '../../utilitarios/formatarMoeda'
import type {
  IndicadorMensal,
  ResumoIndicadores,
} from '../../tipos/indicadorMaquina'
import { tiposDefeito } from '../../tipos/ordemServico'
import type { BarraMensal } from './componentes/GraficoBarras'

// Mês sem OS encerrada não vem do servidor: o resumo dele é zero em tudo.
export const RESUMO_ZERADO: ResumoIndicadores = {
  quantidadeOs: 0,
  horasParadaTotal: 0,
  mttrHoras: 0,
  mtbfHoras: 0,
  custoTotal: 0,
  quantidadeReparos: 0,
  custoReparos: 0,
  quantidadePreventivas: 0,
  custoPreventivas: 0,
  porTipoDefeito: tiposDefeito.map((tipoDefeito) => ({
    tipoDefeito,
    horasParada: 0,
  })),
}

// O recorte que os cards exibem: o histórico inteiro, ou o mês ("MM/YYYY") clicado no
// gráfico. Vale para loja, setor e máquina — todos trazem o próprio porMes.
export function resumoDoPeriodo(
  item: (ResumoIndicadores & { porMes: IndicadorMensal[] }) | undefined,
  mes: string | null,
): ResumoIndicadores | undefined {
  if (!item || !mes) {
    return item
  }
  return item.porMes.find((mensal) => mensal.mes === mes) ?? RESUMO_ZERADO
}

// O servidor só devolve os meses que tiveram OS; o eixo mostra sempre os 12 meses do
// calendário até o atual, com zero nos vazios.
export function montarBarrasMensais(porMes: IndicadorMensal[]): BarraMensal[] {
  const custoPorMes = new Map(porMes.map((item) => [item.mes, item.custoTotal]))
  const reparosPorMes = new Map(porMes.map((item) => [item.mes, item.custoReparos]))
  const preventivasPorMes = new Map(porMes.map((item) => [item.mes, item.custoPreventivas]))
  const hoje = new Date()

  return Array.from({ length: 12 }, (_, indice) => {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - 11 + indice, 1)
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    const chave = `${mes}/${data.getFullYear()}`
    const custo = custoPorMes.get(chave) ?? 0
    const reparos = reparosPorMes.get(chave) ?? 0
    const preventivas = preventivasPorMes.get(chave) ?? 0

    return {
      chave,
      // "05/26": 12 colunas não comportam o ano inteiro no celular.
      rotulo: `${mes}/${String(data.getFullYear()).slice(2)}`,
      valor: custo,
      valorFormatado: formatarMoeda(custo),
      valorReparos: reparos,
      valorReparosFormatado: formatarMoeda(reparos),
      valorPreventivas: preventivas,
      valorPreventivasFormatado: formatarMoeda(preventivas),
    }
  })
}
