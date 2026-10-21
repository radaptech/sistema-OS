import { Activity, CalendarCheck, CircleDollarSign, Clock, Hammer, Timer, type LucideIcon } from 'lucide-react'
import { Esqueleto } from '../../../componentes/Esqueleto'
import { formatarHoras } from '../../../utilitarios/formatarHoras'
import { formatarMoeda } from '../../../utilitarios/formatarMoeda'
import type { ResumoIndicadores } from '../../../tipos/indicadorMaquina'
import { CardIndicador } from './CardIndicador'

interface GradeIndicadoresProps {
  resumo: ResumoIndicadores
  // Só a tela da loja: os pequenos reparos não têm máquina, então entram numa faixa à parte
  // (custo e quantidade). A etapa da máquina não passa isto.
  mostrarReparos?: boolean
  // Clicar na faixa de reparos abre a lista deles. Ausente = faixa só de leitura.
  aoVerReparos?: () => void
  // Loja e máquina: as manutenções preventivas também ficam numa faixa à parte, e a preventiva
  // tem máquina, então aparece nas duas etapas.
  mostrarPreventivas?: boolean
  aoVerPreventivas?: () => void
  // Clicar no card de custo abre a lista das OS de máquina que o formam. Ausente = só leitura.
  aoVerMaquinario?: () => void
}

// Os quatro cards do painel, na mesma ordem em toda etapa (loja e máquina). Embaixo vêm as faixas
// do que fica FORA do maquinário — manutenções preventivas e pequenos reparos —, para o Gestor ver
// os custos lado a lado e nunca somados. Com alguma faixa, o card de custo diz que é do maquinário.
export function GradeIndicadores({
  resumo,
  mostrarReparos = false,
  aoVerReparos,
  mostrarPreventivas = false,
  aoVerPreventivas,
  aoVerMaquinario,
}: GradeIndicadoresProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <CardIndicador
        Icone={Clock}
        rotulo="Horas Parada"
        valor={formatarHoras(resumo.horasParadaTotal)}
      />
      <CardIndicador
        Icone={Timer}
        rotulo="MTTR"
        valor={formatarHoras(resumo.mttrHoras)}
      />
      <CardIndicador
        Icone={Activity}
        rotulo="MTBF"
        valor={formatarHoras(resumo.mtbfHoras)}
      />
      <CardIndicador
        Icone={CircleDollarSign}
        rotulo={mostrarReparos || mostrarPreventivas ? 'Custo Maquinário' : 'Custo Total'}
        valor={formatarMoeda(resumo.custoTotal)}
        aoClicar={aoVerMaquinario}
        dica="Ver as OS que formam este custo"
      />
      {mostrarPreventivas && (
        <FaixaCustoAParte
          Icone={CalendarCheck}
          titulo="Manutenção Preventiva · custo à parte"
          custo={resumo.custoPreventivas}
          quantidade={resumo.quantidadePreventivas}
          unidade={['preventiva', 'preventivas']}
          classeBorda="border-amber-400"
          classeIcone="bg-amber-500"
          dica="Ver as manutenções preventivas"
          aoClicar={aoVerPreventivas}
        />
      )}
      {mostrarReparos && (
        <FaixaCustoAParte
          Icone={Hammer}
          titulo="Pequenos Reparos · custo à parte"
          custo={resumo.custoReparos}
          quantidade={resumo.quantidadeReparos}
          unidade={['reparo', 'reparos']}
          classeBorda="border-orange-400"
          classeIcone="bg-orange-500"
          dica="Ver os pequenos reparos"
          aoClicar={aoVerReparos}
        />
      )}
    </div>
  )
}

interface FaixaCustoAParteProps {
  Icone: LucideIcon
  titulo: string
  custo: number
  quantidade: number
  unidade: [string, string]
  classeBorda: string
  classeIcone: string
  dica: string
  // Ausente = faixa só de leitura.
  aoClicar?: () => void
}

function FaixaCustoAParte({
  Icone,
  titulo,
  custo,
  quantidade,
  unidade,
  classeBorda,
  classeIcone,
  dica,
  aoClicar,
}: FaixaCustoAParteProps) {
  return (
    <div
      // Botão de verdade quando dá para abrir a lista: teclado e leitor de tela funcionam.
      role={aoClicar ? 'button' : undefined}
      tabIndex={aoClicar ? 0 : undefined}
      onClick={aoClicar}
      onKeyDown={(evento) => {
        if (aoClicar && (evento.key === 'Enter' || evento.key === ' ')) {
          evento.preventDefault()
          aoClicar()
        }
      }}
      title={aoClicar ? dica : undefined}
      className={`shadow-card col-span-2 flex min-w-0 items-center gap-3 rounded-2xl border-l-4 ${classeBorda} bg-white p-3 sm:col-span-4 sm:p-4 ${
        aoClicar ? 'hover:shadow-card-hover cursor-pointer transition-shadow' : ''
      }`}
    >
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${classeIcone} text-white`}>
        <Icone size={12} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-[10px] font-semibold text-slate-400 uppercase">
          {titulo}
        </p>
        <p className="truncate font-mono text-base font-bold text-slate-800 sm:text-lg">
          {formatarMoeda(custo)}
        </p>
      </div>
      <p className="shrink-0 font-mono text-[11px] text-slate-400">
        {quantidade} {quantidade === 1 ? unidade[0] : unidade[1]}
        {aoClicar && quantidade > 0 && ' ›'}
      </p>
    </div>
  )
}

export function EsqueletoGradeIndicadores() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }, (_, indice) => (
        <div key={indice} className="shadow-card rounded-2xl bg-white p-4">
          <Esqueleto className="h-4 w-4 rounded" />
          <Esqueleto className="mt-3 h-3 w-20" />
          <Esqueleto className="mt-2 h-5 w-16" />
        </div>
      ))}
    </div>
  )
}
