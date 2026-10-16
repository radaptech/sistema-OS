import { Zap } from 'lucide-react'
import type { OrigemSolicitacao } from '../tipos/ordemServico'
import { BadgeOrigemPreventiva } from './BadgeOrigemPreventiva'

interface BadgeOrigemOSProps {
  origem: OrigemSolicitacao
}

// De onde veio a OS, para os cards de OS (a de pedido do Solicitante é o caso comum e não leva
// selo). Preventiva é âmbar: nasce sozinha, de uma data, e o Técnico/Gestor precisam distingui-la
// de um defeito relatado. Direta é neutra: o Gestor ou o Administrador abriu sem passar pela fila.
export function BadgeOrigemOS({ origem }: BadgeOrigemOSProps) {
  if (origem === 'preventiva') {
    return <BadgeOrigemPreventiva />
  }

  if (origem === 'direta') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 font-mono text-xs font-semibold whitespace-nowrap text-slate-600 ring-1 ring-slate-500/15 ring-inset">
        <Zap size={12} />
        Direta
      </span>
    )
  }

  return null
}
