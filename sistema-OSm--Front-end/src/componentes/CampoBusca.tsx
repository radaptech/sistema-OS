import { Search } from 'lucide-react'

interface CampoBuscaProps {
  valor: string
  aoMudar: (valor: string) => void
  placeholder?: string
}

export function CampoBusca({ valor, aoMudar, placeholder = 'Buscar...' }: CampoBuscaProps) {
  return (
    <div className="relative flex-1">
      <Search
        size={18}
        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
      />
      <input
        type="search"
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        placeholder={placeholder}
        className="h-[46px] w-full rounded-xl border border-slate-200/60 bg-white pr-4 pl-11 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-marca-500 focus:ring-2 focus:ring-marca-500/20"
      />
    </div>
  )
}
