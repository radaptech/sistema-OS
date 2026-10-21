import { ArrowLeft, type LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AlternadorTema } from './AlternadorTema'
import { useAlturaCabecalho } from '../hooks/useAlturaCabecalho'

interface CabecalhoSubpaginaProps {
  contexto: string
  titulo: string
  Icone: LucideIcon
}

export function CabecalhoSubpagina({
  contexto,
  titulo,
  Icone,
}: CabecalhoSubpaginaProps) {
  const referenciaCabecalho = useAlturaCabecalho<HTMLElement>()
  const navegar = useNavigate()

  return (
    <header
      ref={referenciaCabecalho}
      className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 shadow-sm backdrop-blur-lg"
    >
      <div className="flex w-full items-center gap-2.5 px-4 py-3 sm:px-8">
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => navegar(-1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <ArrowLeft size={20} />
        </button>

        <span className="bg-marca-100 text-marca-600 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <Icone size={20} strokeWidth={2.5} />
        </span>

        <div className="min-w-0">
          <p className="text-marca-600 font-mono text-[10px] font-bold tracking-widest uppercase">
            {contexto}
          </p>
          <p className="font-display truncate text-base font-bold text-slate-800">
            {titulo}
          </p>
        </div>

        <div className="ml-auto">
          <AlternadorTema />
        </div>
      </div>
    </header>
  )
}
