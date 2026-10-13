import { CalendarClock, ChevronRight } from 'lucide-react'
import { formatarData } from '../../../utilitarios/formatarData'
import type { PreventivaListada } from '../../../tipos/maquina'

interface CardPreventivaProps {
  preventiva: PreventivaListada
  // Abre o histórico da preventiva (último nível da aba "Manutenção Prev.").
  aoClicar: () => void
}

export function CardPreventiva({ preventiva, aoClicar }: CardPreventivaProps) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      className="group flex w-full items-center justify-between gap-3 rounded-2xl bg-white p-4 text-left shadow-card transition-shadow duration-200 hover:shadow-card-hover"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-marca-600 text-white">
          <CalendarClock size={16} />
        </span>
        <div>
          <p className="font-semibold text-slate-800">{preventiva.maquinaNome}</p>
          <p className="mt-0.5 text-sm text-slate-500">{preventiva.descricao}</p>
          <p className="mt-1 font-mono text-xs text-slate-400">
            A cada {preventiva.intervaloDias} dia(s) · Próxima:{' '}
            {formatarData(preventiva.proximaData)}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold whitespace-nowrap ${
            preventiva.ativa
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-200 text-slate-500'
          }`}
        >
          {preventiva.ativa ? 'Ativa' : 'Inativa'}
        </span>
        <ChevronRight
          size={18}
          className="text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-marca-600"
        />
      </div>
    </button>
  )
}
