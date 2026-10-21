import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from 'react'

interface CampoSelecaoProps extends SelectHTMLAttributes<HTMLSelectElement> {
  rotulo: string
  mensagemErro?: string
  children: ReactNode
}

export const CampoSelecao = forwardRef<HTMLSelectElement, CampoSelecaoProps>(
  ({ rotulo, mensagemErro, id, className = '', name, children, ...props }, ref) => {
    // Sufixo do useId: com só o name, dois formulários na mesma tela (a máquina e o
    // modal de preventiva, ambos com "descricao") repetiam o id, e o rótulo de um
    // apontava para o campo do outro.
    const idGerado = useId()
    const selectId = id ?? (name ? `${name}-${idGerado}` : idGerado)

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={selectId}
          className="text-[10px] font-bold tracking-widest text-slate-500 uppercase"
        >
          {rotulo}
        </label>
        <select
          id={selectId}
          name={name}
          ref={ref}
          className={`h-[46px] w-full rounded-xl border bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:ring-2 ${
            mensagemErro
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
              : 'border-slate-200/60 focus:border-marca-500 focus:ring-marca-500/20'
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        {mensagemErro && (
          <span className="text-xs font-medium text-red-500">{mensagemErro}</span>
        )}
      </div>
    )
  },
)

CampoSelecao.displayName = 'CampoSelecao'
