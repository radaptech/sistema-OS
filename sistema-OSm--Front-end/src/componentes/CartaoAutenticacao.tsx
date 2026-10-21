import type { ReactNode } from 'react'
import { Wrench } from 'lucide-react'
import { AlternadorTema } from './AlternadorTema'

interface CartaoAutenticacaoProps {
  subtitulo: string
  children: ReactNode
}

// Moldura única de login, esqueci a senha e redefinir senha: as três telas são o mesmo cartão, só muda o miolo.
export function CartaoAutenticacao({
  subtitulo,
  children,
}: CartaoAutenticacaoProps) {
  return (
    <div className="bg-marca-600 relative isolate flex min-h-svh items-center justify-center overflow-hidden p-4">
      <div className="bg-grade-industrial bg-grade pointer-events-none absolute inset-0 opacity-[0.12]" />
      <div className="bg-marca-300/20 pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl" />
      <div className="bg-marca-500/30 pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 rounded-full blur-3xl" />

      {/* Fora dos cabeçalhos: quem prefere o tema escuro e ainda não entrou não tem cabeçalho nenhum pra clicar. */}
      <div className="absolute top-3 right-3">
        <AlternadorTema classe="text-white/80 hover:bg-white/10 hover:text-white" />
      </div>

      <div className="animate-pop-in shadow-marca-950/40 relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="p-6 sm:p-8">
          <div className="text-center">
            <span className="bg-marca-100 text-marca-600 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm">
              <Wrench size={22} strokeWidth={2.5} />
            </span>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Solicitação OS
            </h1>
            <p className="mt-1 font-mono text-xs font-bold tracking-widest text-slate-400 uppercase">
              {subtitulo}
            </p>
          </div>

          {children}
        </div>

        <div className="border-t border-slate-100 px-6 py-4 text-center sm:px-8">
          <span className="text-marca-500/50 font-mono text-[10px] font-semibold tracking-widest uppercase">
            Solicitação OS © {new Date().getFullYear()}
          </span>
        </div>
      </div>
    </div>
  )
}
