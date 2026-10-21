// Mesmo padrão visual de FiltroStatusSolicitacao (PainelGestor): par de pílulas com
// contagem, não abas de rota — a tela é uma só, só a lista embaixo muda.
export type AbaRevisaoCusto = 'pendentes' | 'revisadas'

const OPCOES: { valor: AbaRevisaoCusto; rotulo: string }[] = [
  { valor: 'pendentes', rotulo: 'Pendentes' },
  { valor: 'revisadas', rotulo: 'Revisadas' },
]

interface FiltroRevisaoCustoProps {
  valor: AbaRevisaoCusto
  aoMudar: (valor: AbaRevisaoCusto) => void
  contagens: Record<AbaRevisaoCusto, number>
}

export function FiltroRevisaoCusto({
  valor,
  aoMudar,
  contagens,
}: FiltroRevisaoCustoProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {OPCOES.map((opcao) => {
        const ativo = opcao.valor === valor

        return (
          <button
            key={opcao.valor}
            type="button"
            onClick={() => aoMudar(opcao.valor)}
            aria-pressed={ativo}
            className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              ativo
                ? 'shadow-card bg-white text-marca-800'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            {opcao.rotulo}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                ativo
                  ? 'bg-marca-100 text-marca-800'
                  : 'bg-white/10 text-slate-300'
              }`}
            >
              {contagens[opcao.valor]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
