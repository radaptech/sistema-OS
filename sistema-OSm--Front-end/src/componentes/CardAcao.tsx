import type { LucideIcon } from 'lucide-react'

interface CardAcaoProps {
  titulo: string
  descricao: string
  Icone: LucideIcon
  variante?: 'padrao' | 'destaque' | 'reparo' | 'terceiros'
  aoClicar?: () => void
}

// Tingido claro em vez de sólido saturado: com quatro desses lado a lado na Home, quatro
// blocos de cor cheia disputavam a atenção entre si e nenhum vencia. O fundo tênue deixa
// a cor fazer só o trabalho de identificar a ação.
const ESTILOS_VARIANTE: Record<
  NonNullable<CardAcaoProps['variante']>,
  { card: string; icone: string }
> = {
  padrao: {
    card: 'bg-slate-50 border-slate-200/60 text-slate-700 hover:bg-slate-100',
    icone: 'bg-slate-200/70 text-slate-600',
  },
  destaque: {
    card: 'bg-marca-100 border-marca-300/40 text-marca-900 hover:bg-marca-300/30',
    icone: 'bg-marca-600 text-white',
  },
  // Pequenos Reparos usa uma cor própria (âmbar/laranja) para se diferenciar visualmente
  // da OS de Maquinário (verde), sem reaproveitar o âmbar já usado como cor de "alerta"
  // (BadgeOrigemPreventiva, status Pausada) em outras telas.
  reparo: {
    card: 'bg-orange-50 border-orange-100 text-orange-800 hover:bg-orange-100',
    icone: 'bg-orange-600 text-white',
  },
  // Azul reforça o caráter "externo/parceiro" do atendimento terceirizado, sem repetir
  // verde (Maquinário), laranja (Pequenos Reparos) ou âmbar (alerta). Sem uso na Home
  // desde que terceirizar virou decisão do Técnico — mantido para listagens de OS.
  terceiros: {
    card: 'bg-blue-50 border-blue-100 text-blue-800 hover:bg-blue-100',
    icone: 'bg-blue-600 text-white',
  },
}

export function CardAcao({
  titulo,
  descricao,
  Icone,
  variante = 'padrao',
  aoClicar,
}: CardAcaoProps) {
  const estilos = ESTILOS_VARIANTE[variante]

  return (
    <button
      type="button"
      onClick={aoClicar}
      className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.99] ${estilos.card}`}
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${estilos.icone}`}
      >
        <Icone size={24} />
      </span>
      <span className="flex flex-col">
        <span className="font-display font-bold">{titulo}</span>
        <span className="text-sm opacity-70">{descricao}</span>
      </span>
    </button>
  )
}
