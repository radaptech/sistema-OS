import { LogOut, Wrench } from 'lucide-react'
import { useEstadoAutenticacao } from '../estado/estadoAutenticacao'
import { useSair } from '../hooks/useSair'
import { AlternadorTema } from './AlternadorTema'
import { SinoNotificacoes } from './SinoNotificacoes'

export function CabecalhoTopo() {
  const nomeUsuario = useEstadoAutenticacao((estado) => estado.nomeUsuario)
  const aoSair = useSair()

  return (
    // Barra clara e translúcida em vez da faixa verde cheia: o verde continua sendo a cor
    // da marca, mas concentrado no selo do logo. Espalhado na largura toda ele competia
    // com o conteúdo da página em vez de emoldurá-lo.
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 shadow-sm backdrop-blur-lg">
      <div className="flex w-full items-center justify-between px-4 py-3 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="bg-marca-600 shadow-marca-600/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md">
            <Wrench size={20} strokeWidth={2.5} />
          </span>
          <div>
            <p className="font-mono text-xs font-bold tracking-widest text-slate-800 uppercase">
              Solicitação OS
            </p>
            <p className="text-sm text-slate-500">Olá, {nomeUsuario} 👋</p>
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
