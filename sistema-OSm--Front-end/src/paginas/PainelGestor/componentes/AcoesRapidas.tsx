import { ClipboardPlus, Filter, Gauge } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface AcoesRapidasProps {
  aoAbrirFiltros: () => void
  quantidadeFiltrosAtivos: number
}

export function AcoesRapidas({
  aoAbrirFiltros,
  quantidadeFiltrosAtivos,
}: AcoesRapidasProps) {
  const navegar = useNavigate()

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => navegar('/abrir-os-direta')}
        className="bg-marca-600 shadow-marca-600/20 duration-rapido hover:bg-marca-800 flex h-[46px] items-center gap-2 rounded-xl px-5 text-sm font-bold text-white shadow-sm transition-colors"
      >
        <ClipboardPlus size={16} />
        Abrir OS
      </button>

      <button
        type="button"
        onClick={() => navegar('/dashboard-gestor')}
        className="duration-rapido flex h-[46px] items-center gap-2 rounded-xl border border-slate-200/60 bg-white px-5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
      >
        <Gauge size={16} />
        Indicadores
      </button>

      <button
        type="button"
        onClick={aoAbrirFiltros}
        className="duration-rapido relative flex h-[46px] items-center gap-2 rounded-xl border border-slate-200/60 bg-white px-5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
      >
        <Filter size={16} />
        Filtrar OS
        {quantidadeFiltrosAtivos > 0 && (
          <span className="bg-marca-500 flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-mono text-[11px] font-bold text-white">
            {quantidadeFiltrosAtivos}
          </span>
        )}
      </button>
    </div>
  )
}
