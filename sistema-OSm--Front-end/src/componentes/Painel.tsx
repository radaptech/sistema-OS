import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface PainelProps {
  titulo: string
  descricao?: string
  Icone: LucideIcon
  // Edição usa âmbar em vez do verde da marca porque o usuário precisa perceber, sem ler
  // o título, que aquele formulário vai sobrescrever um registro e não criar um novo.
  variante?: 'padrao' | 'edicao'
  acao?: ReactNode
  children: ReactNode
  className?: string
}

const ESTILOS_ICONE = {
  padrao: 'bg-marca-100 text-marca-600',
  edicao: 'bg-amber-100 text-amber-600',
}

export function Painel({
  titulo,
  descricao,
  Icone,
  variante = 'padrao',
  acao,
  children,
  className = '',
}: PainelProps) {
  return (
    // Superfície levemente tingida em cima do branco do card, não um segundo card com
    // sombra: empilhar sombra dentro de sombra achata a hierarquia e a seção passa a
    // competir com o container em vez de se subordinar a ele.
    <section
      className={`rounded-2xl border border-slate-200/60 bg-slate-50/50 p-5 sm:p-6 ${className}`}
    >
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ESTILOS_ICONE[variante]}`}
          >
            <Icone size={16} />
          </span>
          <div>
            <h3 className="font-display text-base font-bold text-slate-800">{titulo}</h3>
            {descricao && <p className="mt-0.5 text-xs text-slate-500">{descricao}</p>}
          </div>
        </div>

        {acao && <div className="shrink-0">{acao}</div>}
      </div>

      {children}
    </section>
  )
}
