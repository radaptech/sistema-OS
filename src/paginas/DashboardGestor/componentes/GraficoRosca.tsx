interface SegmentoRosca {
  rotulo: string
  valor: number
  valorFormatado: string
  cor: string
}

interface GraficoRoscaProps {
  titulo: string
  subtitulo?: string
  dados: SegmentoRosca[]
  rotuloCentral: string
  valorCentral: string
}

const TAMANHO = 160
const RAIO = 60
const CENTRO = TAMANHO / 2
const ESPESSURA = 20
const CIRCUNFERENCIA = 2 * Math.PI * RAIO
const GAP = 3

export function GraficoRosca({
  titulo,
  subtitulo,
  dados,
  rotuloCentral,
  valorCentral,
}: GraficoRoscaProps) {
  const total = dados.reduce((soma, item) => soma + item.valor, 0)

  const comprimentos = dados.map((item) =>
    total > 0 ? (item.valor / total) * CIRCUNFERENCIA : 0,
  )
  const deslocamentos = comprimentos.map((_, indice) =>
    comprimentos.slice(0, indice).reduce((soma, valor) => soma + valor, 0),
  )

  return (
    <div className="shadow-card rounded-2xl bg-white p-4">
      <h3 className="font-display text-sm font-semibold text-slate-700">
        {titulo}
      </h3>
      {subtitulo && (
        <p className="mt-0.5 text-xs text-slate-400">{subtitulo}</p>
      )}

      {total === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">
          Sem paradas registradas no período.
        </p>
      ) : (
        <div className="mt-3 flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
          <div
            className="relative shrink-0"
            style={{ width: TAMANHO, height: TAMANHO }}
          >
            <svg
              width={TAMANHO}
              height={TAMANHO}
              viewBox={`0 0 ${TAMANHO} ${TAMANHO}`}
            >
              <circle
                cx={CENTRO}
                cy={CENTRO}
                r={RAIO}
                fill="none"
                // Token, não hex: no tema escuro o anel claro vazava como risco branco nos vãos.
                stroke="var(--color-slate-100)"
                strokeWidth={ESPESSURA}
              />
              {dados.map((item, indice) => {
                const comprimento = comprimentos[indice]
                const comprimentoRenderizado = Math.max(comprimento - GAP, 0)
                const offset = deslocamentos[indice]

                return (
                  <circle
                    key={item.rotulo}
                    cx={CENTRO}
                    cy={CENTRO}
                    r={RAIO}
                    fill="none"
                    stroke={item.cor}
                    strokeWidth={ESPESSURA}
                    strokeLinecap="butt"
                    strokeDasharray={`${comprimentoRenderizado} ${CIRCUNFERENCIA - comprimentoRenderizado}`}
                    strokeDashoffset={-offset - GAP / 2}
                    transform={`rotate(-90 ${CENTRO} ${CENTRO})`}
                  >
                    <title>
                      {item.rotulo}: {item.valorFormatado}
                    </title>
                  </circle>
                )
              })}
            </svg>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-mono text-lg font-bold text-slate-800">
                {valorCentral}
              </p>
              <p className="font-mono text-[10px] text-slate-400 uppercase">
                {rotuloCentral}
              </p>
            </div>
          </div>

          {/* Valor e porcentagem colados ao nome: espalhados na largura do cartão eles
              viravam números soltos, sem dizer de qual fatia eram. */}
          <ul className="flex w-full max-w-xs flex-col gap-3">
            {dados.map((item) => (
              <li key={item.rotulo} className="flex items-start gap-2.5">
                <span
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.cor }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700">
                    {item.rotulo}
                  </p>
                  <p className="font-mono text-xs text-slate-500">
                    {item.valorFormatado} ·{' '}
                    {Math.round((item.valor / total) * 100)}%
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
