import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'

interface CampoTextoProps extends InputHTMLAttributes<HTMLInputElement> {
  rotulo: string
  mensagemErro?: string
  icone?: ReactNode
}

export const CampoTexto = forwardRef<HTMLInputElement, CampoTextoProps>(
  ({ rotulo, mensagemErro, icone, id, className = '', name, ...props }, ref) => {
    // Sufixo do useId: com só o name, dois formulários na mesma tela (a máquina e o
    // modal de preventiva, ambos com "descricao") repetiam o id, e o rótulo de um
    // apontava para o campo do outro.
    const idGerado = useId()
    const inputId = id ?? (name ? `${name}-${idGerado}` : idGerado)

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-[10px] font-bold tracking-widest text-slate-500 uppercase"
        >
          {rotulo}
        </label>
        <div className="relative">
          <input
            id={inputId}
            name={name}
            ref={ref}
            // Altura fixa em vez de padding: o campo fica lado a lado com botões e selects,
            // e alinhar isso por padding volta a desalinhar assim que o tamanho do texto muda.
            className={`h-[46px] w-full rounded-xl border bg-white px-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
              mensagemErro
                ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                : 'border-slate-200/60 focus:border-marca-500 focus:ring-marca-500/20'
            } ${icone ? 'pr-11' : ''} ${className}`}
            {...props}
          />
          {icone && (
            <div className="absolute inset-y-0 right-3 flex items-center">{icone}</div>
          )}
        </div>
        {mensagemErro && (
          <span className="text-xs font-medium text-red-500">{mensagemErro}</span>
        )}
      </div>
    )
  },
)

CampoTexto.displayName = 'CampoTexto'
