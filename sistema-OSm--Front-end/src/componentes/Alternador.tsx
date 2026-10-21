interface AlternadorProps {
  marcado: boolean
  aoAlternar: (valor: boolean) => void
  rotulo?: string
  descricao?: string
  id?: string
}

export function Alternador({ marcado, aoAlternar, rotulo, descricao, id }: AlternadorProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-4 py-3">
      {(rotulo || descricao) && (
        <div>
          {rotulo && <p className="text-sm font-semibold text-slate-700">{rotulo}</p>}
          {descricao && <p className="text-xs text-slate-400">{descricao}</p>}
        </div>
      )}

      <button
        type="button"
        role="switch"
        aria-checked={marcado}
        id={id}
        onClick={() => aoAlternar(!marcado)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          marcado ? 'bg-marca-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
            marcado ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}
