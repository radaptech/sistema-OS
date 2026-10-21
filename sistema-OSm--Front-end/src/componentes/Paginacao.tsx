import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginacaoProps {
  pagina: number
  totalPaginas: number
  aoMudarPagina: (pagina: number) => void
}

export function Paginacao({ pagina, totalPaginas, aoMudarPagina }: PaginacaoProps) {
  const desabilitarAnterior = pagina <= 1
  const desabilitarProxima = pagina >= totalPaginas

  const estiloBotao =
    'flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:bg-slate-100'

  return (
    // Barra própria em vez de dois botões soltos: a paginação fica no fim de uma lista de
    // cards, e sem uma superfície embaixo ela lia como parte do último card.
    <div className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white p-3 shadow-sm sm:px-4">
      <button
        type="button"
        disabled={desabilitarAnterior}
        onClick={() => aoMudarPagina(pagina - 1)}
        className={estiloBotao}
      >
        <ChevronLeft size={16} />
        <span className="hidden sm:inline">Anterior</span>
      </button>

      <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
        {pagina} de {totalPaginas}
      </span>

      <button
        type="button"
        disabled={desabilitarProxima}
        onClick={() => aoMudarPagina(pagina + 1)}
        className={estiloBotao}
      >
        <span className="hidden sm:inline">Próxima</span>
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
