import type { AbaPainelGestor } from '../abasPainelGestor'

const ABAS: { chave: AbaPainelGestor; rotulo: string }[] = [
  { chave: 'solicitacoes', rotulo: 'Solicitações' },
  { chave: 'os-em-andamento', rotulo: 'OS em Andamento' },
  { chave: 'os-finalizadas', rotulo: 'OS Finalizadas' },
  { chave: 'manutencao-preventiva', rotulo: 'Manutenção Prev.' },
]

interface AbasPainelGestorProps {
  abaSelecionada: AbaPainelGestor
  aoSelecionarAba: (aba: AbaPainelGestor) => void
}

export function AbasPainelGestor({ abaSelecionada, aoSelecionarAba }: AbasPainelGestorProps) {
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
