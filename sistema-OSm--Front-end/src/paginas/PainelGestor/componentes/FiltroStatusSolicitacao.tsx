import type { StatusSolicitacao } from '../../../tipos/ordemServico'

// Só os dois status que ficam parados esperando o Gestor. 'Convertida' não entra: assim
// que a OS é aberta, o acompanhamento passa para as abas de OS.
export type StatusFilaGestor = Extract<
  StatusSolicitacao,
  'Pendente' | 'Rejeitada'
>

const OPCOES: { valor: StatusFilaGestor; rotulo: string }[] = [
  { valor: 'Pendente', rotulo: 'Pendentes' },
  { valor: 'Rejeitada', rotulo: 'Rejeitadas' },
]

interface FiltroStatusSolicitacaoProps {
  valor: StatusFilaGestor
  aoMudar: (valor: StatusFilaGestor) => void
  contagens: Record<StatusFilaGestor, number>
}

export function FiltroStatusSolicitacao({
  valor,
  aoMudar,
  contagens,
}: FiltroStatusSolicitacaoProps) {
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
                ? 'bg-marca-600 text-white shadow-sm shadow-marca-600/20'
                : 'border border-slate-200/60 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {opcao.rotulo}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                ativo
                  ? 'bg-white/20 text-white'
                  : 'border border-slate-200/60 bg-slate-50 text-slate-600'
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
