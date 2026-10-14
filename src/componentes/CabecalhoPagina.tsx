import { ArrowLeft, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSair } from '../hooks/useSair'
import { AlternadorTema } from './AlternadorTema'
import { SinoNotificacoes } from './SinoNotificacoes'

interface CabecalhoPaginaProps {
  titulo: string
}

export function CabecalhoPagina({ titulo }: CabecalhoPaginaProps) {
  const navegar = useNavigate()
  const aoSair = useSair()

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 shadow-sm backdrop-blur-lg">
      <div className="flex w-full items-center justify-between px-4 py-3 sm:px-8">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            aria-label="Voltar"
            onClick={() => navegar(-1)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="text-marca-600 font-mono text-[10px] font-bold tracking-widest uppercase">
              Solicitação OS
            </p>
            <p className="font-display text-base font-bold text-slate-800">
              {titulo}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <AlternadorTema />

          <SinoNotificacoes />
          <button
            type="button"
            aria-label="Sair"
            onClick={aoSair}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  )
}
