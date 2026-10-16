export interface BarraMensal {
  chave: string
  rotulo: string
  valor: number
  valorFormatado: string
  // Custo dos pequenos reparos no mês, empilhado sobre o do maquinário: duas séries, nunca
  // um número só.
  valorReparos?: number
  valorReparosFormatado?: string
}

interface GraficoBarrasProps {
  titulo: string
  dados: BarraMensal[]
  selecionada: string | null
  aoSelecionar: (chave: string) => void
}

const COR_BARRA = '#2a78d6'
// Laranja contra o azul: distingue mesmo sem a legenda, que repete o nome em texto.
const COR_REPAROS = '#e8871e'

export function GraficoBarras({
  titulo,
  dados,
  selecionada,
  aoSelecionar,
}: GraficoBarrasProps) {
  // A altura é a do total empilhado (maquinário + reparos), para as duas séries caberem.
  const valorMaximo = Math.max(...dados.map((item) => item.valor + (item.valorReparos ?? 0)), 1)
  // Só mostra a série e a legenda de reparos quando existe algum reparo no período.
  const temReparos = dados.some((item) => (item.valorReparos ?? 0) > 0)

  return (
    <div className="shadow-card rounded-2xl bg-white p-4">
      <h3 className="font-display text-sm font-semibold text-slate-700">
        {titulo}
      </h3>

      {temReparos && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-slate-500">
          <li className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: COR_BARRA }} />
            Maquinário
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: COR_REPAROS }} />
            Pequenos reparos
          </li>
        </ul>
      )}

      <div className="mt-4 flex h-36 items-end gap-1 sm:gap-2">
        {dados.map((item, indice) => {
          // Mês sem custo fica sem barra; o mínimo de 3% só mantém visível um valor baixo.
          const reparos = item.valorReparos ?? 0
          const alturaPercentual =
            item.valor > 0 ? Math.max((item.valor / valorMaximo) * 100, 3) : 0
          const alturaReparos =
            reparos > 0 ? Math.max((reparos / valorMaximo) * 100, 3) : 0

          const ativa = item.chave === selecionada
          // Com um mês escolhido, os outros recuam: fica claro de qual mês são os
          // números dos cards e da rosca.
          const esmaecida = selecionada !== null && !ativa

          return (
            // A coluna inteira é o botão, para dar para clicar num mês sem custo
            // (barra de altura zero) e ver que ele não teve nada.
            <button
              type="button"
              key={item.chave}
              onClick={() => aoSelecionar(item.chave)}
              aria-pressed={ativa}
              aria-label={`${item.chave}: ${item.valorFormatado}${reparos > 0 ? `, pequenos reparos ${item.valorReparosFormatado}` : ''}`}
              className="group relative flex h-full min-w-0 flex-1 cursor-pointer flex-col items-center rounded-md"
            >
              <div
                className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-slate-800 px-2 py-1 font-mono text-[10px] font-semibold whitespace-nowrap text-slate-50 opacity-0 transition group-hover:opacity-100"
                role="tooltip"
              >
                {item.valorFormatado}
                {reparos > 0 && ` · reparos ${item.valorReparosFormatado}`}
              </div>

              <div className="flex min-h-0 w-full flex-1 flex-col-reverse items-stretch justify-start">
                <div
                  className={`w-full transition-opacity ${reparos > 0 ? '' : 'rounded-t-[4px]'} ${esmaecida ? 'opacity-35 group-hover:opacity-60' : 'group-hover:opacity-80'}`}
                  style={{
                    height: `${alturaPercentual}%`,
                    backgroundColor: COR_BARRA,
                  }}
                />
                {reparos > 0 && (
                  <div
                    className={`w-full rounded-t-[4px] transition-opacity ${esmaecida ? 'opacity-35 group-hover:opacity-60' : 'group-hover:opacity-80'}`}
                    style={{
                      height: `${alturaReparos}%`,
                      backgroundColor: COR_REPAROS,
                    }}
                  />
                )}
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
