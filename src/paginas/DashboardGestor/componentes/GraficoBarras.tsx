export interface BarraMensal {
  chave: string
  rotulo: string
  valor: number
  valorFormatado: string
  // Custo das manutenções preventivas e dos pequenos reparos no mês, empilhados sobre o do
  // maquinário: três séries, nunca um número só.
  valorPreventivas?: number
  valorPreventivasFormatado?: string
  valorReparos?: number
  valorReparosFormatado?: string
}

interface GraficoBarrasProps {
  titulo: string
  dados: BarraMensal[]
  selecionada: string | null
  aoSelecionar: (chave: string) => void
}

// Ordem fixa de baixo para cima (a mesma da legenda). Cores conferidas no validador da skill de
// dataviz, no tema claro e no escuro: o âmbar da preventiva (o mesmo tom do selo de origem) ao
// lado do laranja antigo dos reparos (#e8871e) não se distinguia nem com visão normal, por isso o
// laranja escureceu. A legenda repete o nome em texto, então a série não depende só da cor.
const SERIES = [
  { nome: 'Maquinário', cor: '#2a78d6', valor: (item: BarraMensal) => item.valor },
  { nome: 'Preventivas', cor: '#b98a06', valor: (item: BarraMensal) => item.valorPreventivas ?? 0 },
  { nome: 'Pequenos reparos', cor: '#c2410c', valor: (item: BarraMensal) => item.valorReparos ?? 0 },
] as const

export function GraficoBarras({
  titulo,
  dados,
  selecionada,
  aoSelecionar,
}: GraficoBarrasProps) {
  // A altura é a do total empilhado, para as três séries caberem.
  const valorMaximo = Math.max(
    ...dados.map((item) => SERIES.reduce((soma, serie) => soma + serie.valor(item), 0)),
    1,
  )
  // A legenda só aparece quando há mais de uma série no período; com só o maquinário, o título
  // já diz o que é.
  const seriesComValor = SERIES.filter((serie) => dados.some((item) => serie.valor(item) > 0))
  const mostrarLegenda = seriesComValor.some((serie) => serie !== SERIES[0])

  return (
    <div className="shadow-card rounded-2xl bg-white p-4">
      <h3 className="font-display text-sm font-semibold text-slate-700">
        {titulo}
      </h3>

      {mostrarLegenda && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-slate-500">
          {seriesComValor.map((serie) => (
            <li key={serie.nome} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: serie.cor }} />
              {serie.nome}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex h-36 items-end gap-1 sm:gap-2">
        {dados.map((item, indice) => {
          const preventivas = item.valorPreventivas ?? 0
          const reparos = item.valorReparos ?? 0
          // Só os segmentos com valor; o de cima leva o canto arredondado.
          const segmentos = SERIES.map((serie) => ({ ...serie, quantia: serie.valor(item) })).filter(
            (segmento) => segmento.quantia > 0,
          )

          const ativa = item.chave === selecionada
          // Com um mês escolhido, os outros recuam: fica claro de qual mês são os
          // números dos cards e da rosca.
          const esmaecida = selecionada !== null && !ativa

          const extras = [
            preventivas > 0 && `preventivas ${item.valorPreventivasFormatado}`,
            reparos > 0 && `reparos ${item.valorReparosFormatado}`,
          ].filter(Boolean)

          return (
            // A coluna inteira é o botão, para dar para clicar num mês sem custo
            // (barra de altura zero) e ver que ele não teve nada.
            <button
              type="button"
              key={item.chave}
              onClick={() => aoSelecionar(item.chave)}
              aria-pressed={ativa}
              aria-label={`${item.chave}: ${item.valorFormatado}${extras.length ? `, ${extras.join(', ')}` : ''}`}
              className="group relative flex h-full min-w-0 flex-1 cursor-pointer flex-col items-center rounded-md"
            >
              <div
                className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-slate-800 px-2 py-1 font-mono text-[10px] font-semibold whitespace-nowrap text-slate-50 opacity-0 transition group-hover:opacity-100"
                role="tooltip"
              >
                {item.valorFormatado}
                {extras.map((extra) => ` · ${extra}`)}
              </div>

              <div className="flex min-h-0 w-full flex-1 flex-col-reverse items-stretch justify-start">
                {segmentos.map((segmento, posicao) => (
                  <div
                    key={segmento.nome}
                    className={`w-full transition-opacity ${posicao === segmentos.length - 1 ? 'rounded-t-[4px]' : ''} ${esmaecida ? 'opacity-35 group-hover:opacity-60' : 'group-hover:opacity-80'}`}
                    style={{
                      // Mês sem custo fica sem barra; o mínimo de 3% só mantém visível um valor baixo.
                      height: `${Math.max((segmento.quantia / valorMaximo) * 100, 3)}%`,
                      backgroundColor: segmento.cor,
                    }}
                  />
                ))}
              </div>

              {/* No celular 12 rótulos "MM/AA" encostam uns nos outros: mostra um sim, um não
                  (o valor de cada barra continua no tooltip). */}
              <span
                className={`mt-1.5 font-mono text-[10px] whitespace-nowrap ${ativa ? 'text-marca-600 font-bold' : `text-slate-400 ${indice % 2 ? 'max-sm:invisible' : ''}`}`}
              >
                {item.rotulo}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
