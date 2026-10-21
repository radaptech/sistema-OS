import { niveisUrgencia, type IdUrgencia } from '../tipos/ordemServico'

const ESTILOS_URGENCIA: Record<IdUrgencia, { ativo: string; inativo: string }> =
  {
    Baixa: {
      ativo: 'border-emerald-500 bg-emerald-50 text-emerald-700',
      inativo: 'border-slate-200 text-slate-500 hover:border-emerald-300',
    },
    Média: {
      ativo: 'border-amber-500 bg-amber-50 text-amber-700',
      inativo: 'border-slate-200 text-slate-500 hover:border-amber-300',
    },
    Alta: {
      ativo: 'border-red-500 bg-red-50 text-red-700',
      inativo: 'border-slate-200 text-slate-500 hover:border-red-300',
    },
  }

interface SeletorUrgenciaProps {
  valor: IdUrgencia | undefined
  aoSelecionar: (nivel: IdUrgencia) => void
  mensagemErro?: string
}

// Os três níveis lado a lado, cada um com a cor do próprio risco. Usado pelo abrir-os da
// fila (ModalAbrirOrdemServico) e pela OS direta (AbrirOSDireta).
export function SeletorUrgencia({
  valor,
  aoSelecionar,
  mensagemErro,
}: SeletorUrgenciaProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-marca-500 font-mono text-xs font-semibold tracking-wide uppercase">
        Nível de Urgência *
      </span>
      <div className="grid grid-cols-3 gap-2">
        {niveisUrgencia.map((nivel) => (
          <button
            key={nivel}
            type="button"
            onClick={() => aoSelecionar(nivel)}
            className={`rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
              valor === nivel
                ? ESTILOS_URGENCIA[nivel].ativo
                : ESTILOS_URGENCIA[nivel].inativo
            }`}
          >
            {nivel}
          </button>
        ))}
      </div>
      {mensagemErro && (
        <span className="text-xs text-red-500">{mensagemErro}</span>
      )}
    </div>
  )
}
