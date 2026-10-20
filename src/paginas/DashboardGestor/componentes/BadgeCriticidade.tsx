import type { NivelCriticidade } from '../../../tipos/maquina'

const ESTILO_POR_CRITICIDADE: Record<NivelCriticidade, string> = {
  Alta: 'bg-red-100 text-red-700 ring-red-600/15',
  Média: 'bg-amber-100 text-amber-700 ring-amber-600/15',
  Baixa: 'bg-slate-100 text-slate-600 ring-slate-600/15',
}

interface BadgeCriticidadeProps {
  criticidade: NivelCriticidade
}

export function BadgeCriticidade({ criticidade }: BadgeCriticidadeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${ESTILO_POR_CRITICIDADE[criticidade]}`}
    >
      Criticidade {criticidade}
    </span>
  )
}
