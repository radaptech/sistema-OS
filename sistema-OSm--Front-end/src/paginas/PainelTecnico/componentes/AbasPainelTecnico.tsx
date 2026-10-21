import type { AbaPainelTecnico } from '../abasPainelTecnico'

const ABAS: { chave: AbaPainelTecnico; rotulo: string }[] = [
  { chave: 'em-aberto', rotulo: 'OS em Aberto' },
  { chave: 'pendentes-pausadas', rotulo: 'Pendentes / Pausadas' },
  { chave: 'concluidas', rotulo: 'OS Concluídas' },
]

interface AbasPainelTecnicoProps {
  abaSelecionada: AbaPainelTecnico
  aoSelecionarAba: (aba: AbaPainelTecnico) => void
}

export function AbasPainelTecnico({
  abaSelecionada,
  aoSelecionarAba,
}: AbasPainelTecnicoProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {ABAS.map((aba) => {
        const ativa = aba.chave === abaSelecionada

        return (
          <button
            key={aba.chave}
            type="button"
            onClick={() => aoSelecionarAba(aba.chave)}
            className={`rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
              ativa
                ? 'bg-marca-600 text-white shadow-sm shadow-marca-600/20'
                : 'border border-slate-200/60 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {aba.rotulo}
          </button>
        )
      })}
    </div>
  )
}
