import { CirclePlus, Hammer, type LucideIcon } from 'lucide-react'
import type { TipoSolicitacao } from '../../../tipos/ordemServico'

interface OpcaoTipo {
  valor: TipoSolicitacao
  titulo: string
  descricao: string
  Icone: LucideIcon
  // Cores por tipo, no mesmo código visual dos antigos cards da Home: verde para o
  // maquinário interno, azul para o atendimento externo, laranja para o pequeno reparo.
  selecionado: string
  iconeSelecionado: string
}

const OPCOES: OpcaoTipo[] = [
  {
    valor: 'maquinario',
    titulo: 'Maquinário',
    descricao: 'Máquina cadastrada que apresentou defeito',
    Icone: CirclePlus,
    selecionado: 'border-marca-500 bg-marca-100',
    iconeSelecionado: 'bg-gradient-to-br from-marca-800 to-marca-500',
  },
  {
    valor: 'reparo',
    titulo: 'Pequenos Reparos',
    descricao: 'Item sem cadastro: lâmpada, vidro, piso...',
    Icone: Hammer,
    selecionado: 'border-orange-500 bg-orange-50',
    iconeSelecionado: 'bg-gradient-to-br from-orange-600 to-orange-400',
  },
]

interface SeletorTipoSolicitacaoProps {
  valor: TipoSolicitacao
  aoSelecionar: (tipo: TipoSolicitacao) => void
}

export function SeletorTipoSolicitacao({
  valor,
  aoSelecionar,
}: SeletorTipoSolicitacaoProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-marca-500 font-mono text-xs font-semibold tracking-wider uppercase">
        Tipo de Solicitação *
      </span>

      <div
        role="radiogroup"
        aria-label="Tipo de solicitação"
        className="grid gap-2.5 sm:grid-cols-2"
      >
        {OPCOES.map(
          ({
            valor: opcao,
            titulo,
            descricao,
            Icone,
            selecionado,
            iconeSelecionado,
          }) => {
            const ativo = opcao === valor

            return (
              <button
                key={opcao}
                type="button"
                role="radio"
                aria-checked={ativo}
                onClick={() => aoSelecionar(opcao)}
                className={`flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all duration-200 hover:-translate-y-0.5 ${
                  ativo
                    ? selecionado
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white transition-colors duration-200 ${
                    ativo ? iconeSelecionado : 'bg-slate-400'
                  }`}
                >
                  <Icone size={18} />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-display text-sm font-bold text-slate-900">
                    {titulo}
                  </span>
                  <span className="text-xs leading-snug text-slate-500">
                    {descricao}
                  </span>
                </span>
              </button>
            )
          },
        )}
      </div>
    </div>
  )
}
