import { ChevronRight } from 'lucide-react'

export interface EtapaTrilha {
  rotulo: string
  // Sem ação é a etapa atual: aparece como texto, não como link.
  aoClicar?: () => void
}

interface TrilhaNavegacaoProps {
  etapas: EtapaTrilha[]
}

export function TrilhaNavegacao({ etapas }: TrilhaNavegacaoProps) {
  return (
    <nav aria-label="Navegação dos indicadores">
      <ol className="flex min-w-0 flex-wrap items-center gap-1 text-xs font-semibold">
        {etapas.map((etapa, indice) => (
          <li key={indice} className="flex min-w-0 items-center gap-1">
            {indice > 0 && (
              <ChevronRight size={12} className="shrink-0 text-slate-300" />
            )}
            {etapa.aoClicar ? (
              <button
                type="button"
                onClick={etapa.aoClicar}
                className="text-marca-600 truncate hover:underline"
              >
                {etapa.rotulo}
              </button>
            ) : (
              <span aria-current="page" className="truncate text-slate-500">
                {etapa.rotulo}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
