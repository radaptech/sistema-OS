import { CalendarClock } from 'lucide-react'

export function BadgeOrigemPreventiva() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 font-mono text-xs font-semibold whitespace-nowrap text-amber-700 ring-1 ring-amber-600/15 ring-inset">
      <CalendarClock size={12} />
      Preventiva
    </span>
  )
}
