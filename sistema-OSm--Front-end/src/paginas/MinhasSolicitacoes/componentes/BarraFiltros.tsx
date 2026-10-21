import { CampoBusca } from '../../../componentes/CampoBusca'
import { statusSolicitacao, type StatusSolicitacao } from '../../../tipos/ordemServico'

export type FiltroStatus = StatusSolicitacao | 'Todos'

const FILTROS: FiltroStatus[] = ['Todos', ...statusSolicitacao]

interface BarraFiltrosProps {
  busca: string
  aoMudarBusca: (valor: string) => void
  filtroSelecionado: FiltroStatus
  aoSelecionarFiltro: (filtro: FiltroStatus) => void
}

export function BarraFiltros({
  busca,
  aoMudarBusca,
  filtroSelecionado,
  aoSelecionarFiltro,
}: BarraFiltrosProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <CampoBusca
        valor={busca}
        aoMudar={aoMudarBusca}
        placeholder="Buscar por máquina ou descrição..."
      />

      <div className="flex flex-wrap items-center gap-2">
        {FILTROS.map((filtro) => {
          const ativo = filtro === filtroSelecionado

          return (
            <button
              key={filtro}
              type="button"
              onClick={() => aoSelecionarFiltro(filtro)}
              className={`rounded-full px-4 py-2 font-mono text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                ativo
                  ? 'bg-marca-600 text-white shadow-sm shadow-marca-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filtro}
            </button>
          )
        })}
      </div>
    </div>
  )
}
