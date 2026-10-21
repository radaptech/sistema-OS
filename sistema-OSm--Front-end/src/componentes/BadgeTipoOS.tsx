import { Building2, Hammer, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TipoOS } from '../tipos/ordemServico'

interface BadgeTipoOSProps {
  tipo: TipoOS
}

const CONFIGURACAO_TIPO: Record<TipoOS, { rotulo: string; estilo: string; Icone: LucideIcon }> = {
  maquinario: {
    rotulo: 'Maquinário',
    estilo: 'bg-emerald-100 text-emerald-700 ring-emerald-600/15',
    Icone: Wrench,
  },
  terceiros: {
    rotulo: 'Terceiros',
    estilo: 'bg-blue-100 text-blue-700 ring-blue-600/15',
    Icone: Building2,
  },
  reparo: {
    rotulo: 'Reparo',
    estilo: 'bg-orange-100 text-orange-700 ring-orange-600/15',
    Icone: Hammer,
  },
}

export function BadgeTipoOS({ tipo }: BadgeTipoOSProps) {
  const { rotulo, estilo, Icone } = CONFIGURACAO_TIPO[tipo]

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 font-mono text-xs font-semibold whitespace-nowrap ring-1 ring-inset ${estilo}`}
    >
      <Icone size={12} />
      {rotulo}
    </span>
  )
}
