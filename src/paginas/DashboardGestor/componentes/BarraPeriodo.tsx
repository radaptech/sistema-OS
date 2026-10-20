interface BarraPeriodoProps {
  mesSelecionado: string | null
  aoLimpar: () => void
}

// "Exibindo histórico completo / Exibindo 05/2026", acima dos cards: deixa explícito de
// qual período são os números, já que o clique numa barra troca todos eles.
export function BarraPeriodo({ mesSelecionado, aoLimpar }: BarraPeriodoProps) {
  return (
    <div className="-mb-1 flex flex-wrap items-center justify-between gap-2">
      <p className="font-mono text-[10px] font-bold tracking-widest text-slate-500 uppercase">
        {mesSelecionado
          ? `Exibindo ${mesSelecionado}`
          : 'Exibindo histórico completo'}
      </p>
      {mesSelecionado ? (
        <button
          type="button"
          onClick={aoLimpar}
          className="text-marca-600 text-xs font-semibold hover:underline"
        >
          Ver histórico completo
        </button>
      ) : (
        <p className="text-xs text-slate-400">
          Clique num mês do gráfico para filtrar
        </p>
      )}
    </div>
  )
}
