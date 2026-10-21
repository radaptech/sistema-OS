import { CheckCircle2, CircleDot, PauseCircle, PlayCircle } from 'lucide-react'
import type { StatusExecucaoOS } from '../tipos/ordemServico'

interface BadgeStatusExecucaoProps {
  status: StatusExecucaoOS
}

const CONFIGURACAO_STATUS: Record<
  StatusExecucaoOS,
  { estilo: string; Icone: typeof PlayCircle }
> = {
  Aberta: { estilo: 'bg-slate-200 text-slate-600 ring-slate-500/15', Icone: CircleDot },
  'Em Andamento': { estilo: 'bg-sky-100 text-sky-700 ring-sky-600/15', Icone: PlayCircle },
  Pausada: { estilo: 'bg-amber-100 text-amber-700 ring-amber-600/15', Icone: PauseCircle },
  Concluída: {
    estilo: 'bg-emerald-100 text-emerald-700 ring-emerald-600/15',
    Icone: CheckCircle2,
  },
}

export function BadgeStatusExecucao({ status }: BadgeStatusExecucaoProps) {
  const { estilo, Icone } = CONFIGURACAO_STATUS[status]

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-xs font-semibold whitespace-nowrap ring-1 ring-inset ${estilo}`}
    >
      <Icone size={12} />
      {status}
    </span>
  )
}
