import { useEffect, useState } from 'react'

const ATRASO_ATE_APARECER_MS = 150

// Fallback do Suspense enquanto o pedaço da rota é baixado (ver RotasPrincipais).
//
// Ele espera antes de aparecer: numa conexão boa o chunk chega em poucas dezenas de
// milissegundos, e piscar um indicador nesse tempo incomoda mais do que a espera em si.
// Passando de ~150ms a troca deixou de ser instantânea para quem olha, e aí sim vale
// mostrar que algo está acontecendo.
export function CarregandoRota() {
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const temporizador = setTimeout(() => setVisivel(true), ATRASO_ATE_APARECER_MS)
    return () => clearTimeout(temporizador)
  }, [])

  if (!visivel) {
    // Mantém a altura da tela para o rodapé/fundo não saltarem enquanto o chunk chega.
    return <div className="min-h-svh bg-slate-50" />
  }

  return (
    <div className="animate-fade-in flex min-h-svh flex-col items-center justify-center gap-4 bg-slate-50">
      <div className="flex w-full max-w-sm flex-col gap-3 px-6">
        <span className="relative block h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <span className="animate-varrer absolute inset-0 bg-gradient-to-r from-transparent via-marca-500/60 to-transparent" />
        </span>
        <p className="text-center font-mono text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
          Carregando tela...
        </p>
      </div>
    </div>
  )
}
