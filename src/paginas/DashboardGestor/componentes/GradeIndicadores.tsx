import { Activity, CircleDollarSign, Clock, Hammer, Timer } from 'lucide-react'
import { Esqueleto } from '../../../componentes/Esqueleto'
import { formatarHoras } from '../../../utilitarios/formatarHoras'
import { formatarMoeda } from '../../../utilitarios/formatarMoeda'
import type { ResumoIndicadores } from '../../../tipos/indicadorMaquina'
import { CardIndicador } from './CardIndicador'

interface GradeIndicadoresProps {
  resumo: ResumoIndicadores
  // Só a tela da loja: os pequenos reparos não têm máquina, então entram numa faixa à parte
  // (custo e quantidade), e o card de custo dos quatro passa a dizer que é do maquinário. A
  // etapa da máquina não passa isto.
  mostrarReparos?: boolean
  // Clicar na faixa de reparos abre a lista deles. Ausente = faixa só de leitura.
  aoVerReparos?: () => void
  // Clicar no card de custo abre a lista das OS de máquina que o formam. Ausente = só leitura.
  aoVerMaquinario?: () => void
}

// Os quatro cards do painel, na mesma ordem em toda etapa (loja e máquina). Na loja, a faixa de
// pequenos reparos vem separada embaixo, para o Gestor ver o custo do maquinário e o dos reparos
// lado a lado e nunca somados.
export function GradeIndicadores({
  resumo,
  mostrarReparos = false,
  aoVerReparos,
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
        rotulo={mostrarReparos ? 'Custo Maquinário' : 'Custo Total'}
        valor={formatarMoeda(resumo.custoTotal)}
        aoClicar={aoVerMaquinario}
        dica="Ver as OS que formam este custo"
      />
      {mostrarReparos && (
        <div
          // Botão de verdade quando dá para abrir a lista: teclado e leitor de tela funcionam.
          role={aoVerReparos ? 'button' : undefined}
          tabIndex={aoVerReparos ? 0 : undefined}
          onClick={aoVerReparos}
          onKeyDown={(evento) => {
            if (aoVerReparos && (evento.key === 'Enter' || evento.key === ' ')) {
              evento.preventDefault()
              aoVerReparos()
            }
          }}
          title={aoVerReparos ? 'Ver os pequenos reparos' : undefined}
          className={`shadow-card col-span-2 flex min-w-0 items-center gap-3 rounded-2xl border-l-4 border-orange-400 bg-white p-3 sm:col-span-4 sm:p-4 ${
            aoVerReparos ? 'hover:shadow-card-hover cursor-pointer transition-shadow' : ''
          }`}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-orange-500 text-white">
            <Hammer size={12} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-[10px] font-semibold text-slate-400 uppercase">
              Pequenos Reparos · custo à parte
            </p>
            <p className="truncate font-mono text-base font-bold text-slate-800 sm:text-lg">
              {formatarMoeda(resumo.custoReparos)}
            </p>
          </div>
          <p className="shrink-0 font-mono text-[11px] text-slate-400">
            {resumo.quantidadeReparos}{' '}
            {resumo.quantidadeReparos === 1 ? 'reparo' : 'reparos'}
            {aoVerReparos && resumo.quantidadeReparos > 0 && ' ›'}
          </p>
        </div>
      )}
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
