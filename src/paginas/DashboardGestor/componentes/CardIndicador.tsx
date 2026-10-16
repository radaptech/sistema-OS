import type { LucideIcon } from 'lucide-react'

interface CardIndicadorProps {
  Icone: LucideIcon
  rotulo: string
  valor: string
  // Quando existe, o card vira um botão que abre a lista por trás do número (as OS que o formam).
  aoClicar?: () => void
  dica?: string
}

export function CardIndicador({ Icone, rotulo, valor, aoClicar, dica }: CardIndicadorProps) {
  const conteudo = (
    <>
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="bg-marca-600 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white">
          <Icone size={12} />
        </span>
        <p className="truncate font-mono text-[10px] font-semibold text-slate-400 uppercase">
          {rotulo}
        </p>
        {aoClicar && <span className="ml-auto shrink-0 text-slate-300">›</span>}
      </div>
      <p className="mt-2 truncate font-mono text-base font-bold text-slate-800 sm:text-lg">
        {valor}
      </p>
    </>
  )

  if (aoClicar) {
    return (
      <button
        type="button"
        onClick={aoClicar}
        title={dica}
        className="shadow-card hover:shadow-card-hover min-w-0 cursor-pointer rounded-2xl bg-white p-3 text-left transition-shadow sm:p-4"
      >
        {conteudo}
      </button>
    )
  }

  return <div className="shadow-card min-w-0 rounded-2xl bg-white p-3 sm:p-4">{conteudo}</div>
}
