import { Wrench } from 'lucide-react'

// Exibido enquanto o app pergunta ao servidor se o cookie de sessão ainda vale. Sem essa
// etapa, recarregar a página cairia direto no login mesmo com a sessão válida.
export function CarregandoSessao() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-gradient-to-br from-marca-950 via-marca-800 to-marca-500">
      <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-white/10">
        <Wrench size={22} className="text-white" />
      </span>
      <p className="font-mono text-xs font-semibold tracking-widest text-white/70 uppercase">
        Carregando sessão...
      </p>
    </div>
  )
}
