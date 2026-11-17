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

      {/* Fora dos cabeçalhos: quem prefere o tema escuro e ainda não entrou não tem cabeçalho nenhum pra clicar. */}
      <div className="absolute top-3 right-3">
        <AlternadorTema classe="text-white/80 hover:bg-white/10 hover:text-white" />
      </div>

      <div className="animate-pop-in shadow-pop relative w-full max-w-md overflow-hidden rounded-xl bg-white">
        <div className="p-6 sm:p-8">
          <div className="text-center">
            <Wrench size={28} strokeWidth={2.25} className="text-marca-600 mx-auto mb-3" />
            <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
              Solicitação OS
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {subtitulo}
            </p>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
