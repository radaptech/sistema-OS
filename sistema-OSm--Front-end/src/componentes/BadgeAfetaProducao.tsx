import { AlertTriangle } from 'lucide-react'

// Sinaliza a OS cuja máquina está parada — a única que acumula tempo de parada (ver
// `afetaProducao` em OrdemServico). Vermelho, e não âmbar, para não se confundir com o
// âmbar já usado em pausa do técnico e preventiva vencida.
export function BadgeAfetaProducao() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 font-mono text-xs font-semibold whitespace-nowrap text-red-700 ring-1 ring-red-600/15 ring-inset">
      <AlertTriangle size={12} />
      Máquina Parada
    </span>
  )
}
