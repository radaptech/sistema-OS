interface CardEstatisticaProps {
  valor: number
  rotulo: string
}

export function CardEstatistica({ valor, rotulo }: CardEstatisticaProps) {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white px-2 py-3 text-center shadow-sm transition-all duration-200 hover:shadow-md sm:px-4 sm:py-4">
      <p className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
        {valor}
      </p>
      <p className="font-mono text-xs tracking-wide text-slate-500 uppercase">
        {rotulo}
      </p>
    </div>
  )
}
