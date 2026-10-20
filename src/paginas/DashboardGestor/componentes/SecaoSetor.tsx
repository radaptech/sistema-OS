import { CalendarCheck, ChevronRight, Hammer, Tag, Wrench } from 'lucide-react'
import { Esqueleto } from '../../../componentes/Esqueleto'
import { ImagemProgressiva } from '../../../componentes/ImagemProgressiva'
import { formatarHoras } from '../../../utilitarios/formatarHoras'
import { formatarMoeda } from '../../../utilitarios/formatarMoeda'
import type { Maquina } from '../../../tipos/maquina'
import type { ResumoIndicadores } from '../../../tipos/indicadorMaquina'
import { BadgeCriticidade } from './BadgeCriticidade'

interface SecaoSetorProps {
  setorNome: string
  fotoUrl?: string
  maquinas: Maquina[]
  // undefined enquanto os indicadores da loja carregam: a seção já aparece com as
  // máquinas, e só os números entram em esqueleto.
  resumoSetor: ResumoIndicadores | undefined
  resumoPorMaquina: Map<number, ResumoIndicadores>
  mostrarResumo?: boolean
  // Clicar no nome do setor filtra a tela por ele (mesmo efeito do chip do topo).
  // Ausente quando o setor já é o escolhido.
  aoSelecionarSetor?: () => void
  atraso: number
  aoSelecionarMaquina: (maquina: Maquina) => void
  // Abre a lista dos pequenos reparos deste setor (a linha laranja vira clicável).
  aoVerReparos?: () => void
  // Abre a lista das manutenções preventivas deste setor (a linha âmbar vira clicável).
  aoVerPreventivas?: () => void
  // Abre a lista das OS de máquina deste setor (as que formam o "Custo Maquinário" acima).
  aoVerMaquinario?: () => void
}

// Um setor da loja: os quatro indicadores dele no topo e as máquinas embaixo, cada uma
// com o próprio resumo. Clicar na máquina abre a etapa individual.
export function SecaoSetor({
  setorNome,
  fotoUrl,
  maquinas,
  resumoSetor,
  resumoPorMaquina,
  mostrarResumo = true,
  aoSelecionarSetor,
  atraso,
  aoSelecionarMaquina,
  aoVerReparos,
  aoVerPreventivas,
  aoVerMaquinario,
}: SecaoSetorProps) {
  return (
    <section
      style={{ animationDelay: `${atraso}ms` }}
      className="shadow-card animate-surgir flex min-w-0 flex-col gap-4 rounded-2xl bg-white p-4"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
        {aoSelecionarSetor ? (
          <button
            type="button"
            onClick={aoSelecionarSetor}
            title="Ver só este setor"
            className="group flex min-w-0 items-center gap-2 text-left"
          >
            <TituloSetor setorNome={setorNome} fotoUrl={fotoUrl} />
            <ChevronRight
              size={16}
              className="group-hover:text-marca-600 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5"
            />
          </button>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <TituloSetor setorNome={setorNome} fotoUrl={fotoUrl} />
          </div>
        )}
        <p className="font-mono text-[11px] text-slate-400">
          {maquinas.length} {maquinas.length === 1 ? 'máquina' : 'máquinas'}
          {resumoSetor &&
            ` · ${resumoSetor.quantidadeOs} ${resumoSetor.quantidadeOs === 1 ? 'OS encerrada' : 'OS encerradas'}`}
        </p>
      </div>

      {mostrarResumo && (
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200/60 bg-slate-50/50 p-3 sm:grid-cols-4">
          <Metrica
            rotulo="Horas Parada"
            valor={resumoSetor && formatarHoras(resumoSetor.horasParadaTotal)}
          />
          <Metrica
            rotulo="MTTR"
            valor={resumoSetor && formatarHoras(resumoSetor.mttrHoras)}
          />
          <Metrica
            rotulo="MTBF"
            valor={resumoSetor && formatarHoras(resumoSetor.mtbfHoras)}
          />
          <Metrica
            rotulo="Custo Maquinário"
            valor={resumoSetor && formatarMoeda(resumoSetor.custoTotal)}
          />
        </div>
      )}

      {mostrarResumo && resumoSetor && resumoSetor.quantidadeOs > 0 && aoVerMaquinario && (
        <button
          type="button"
          onClick={aoVerMaquinario}
          title="Ver as OS que formam o custo do maquinário deste setor"
          className="hover:text-marca-700 flex items-center gap-1 self-start font-mono text-[11px] font-semibold text-slate-500 transition-colors"
        >
          Ver as {resumoSetor.quantidadeOs} {resumoSetor.quantidadeOs === 1 ? 'OS de máquina' : 'OS de máquina'}
          <ChevronRight size={12} />
        </button>
      )}

      {/* Manutenção preventiva é revisão programada, não quebra: o custo dela fica à parte do
          maquinário acima, como o dos reparos. Só aparece quando o setor teve alguma no período. */}
      {mostrarResumo && resumoSetor && resumoSetor.quantidadePreventivas > 0 && (
        <button
          type="button"
          onClick={aoVerPreventivas}
          disabled={!aoVerPreventivas}
          title="Ver as manutenções preventivas deste setor"
          className="flex items-center gap-2 rounded-xl border-l-4 border-amber-400 bg-slate-50/50 px-3 py-2 text-left font-mono text-[11px] text-slate-600 enabled:cursor-pointer enabled:hover:bg-slate-100"
        >
          <CalendarCheck size={12} className="shrink-0 text-amber-500" />
          <span className="font-semibold">Preventivas</span>
          {resumoSetor.quantidadePreventivas}{' '}
          {resumoSetor.quantidadePreventivas === 1 ? 'preventiva' : 'preventivas'} ·{' '}
          {formatarMoeda(resumoSetor.custoPreventivas)}
          {aoVerPreventivas && <ChevronRight size={12} className="ml-auto shrink-0 text-slate-300" />}
        </button>
      )}

      {/* Pequenos reparos não têm máquina: o custo deles fica à parte, nunca somado ao do
          maquinário acima. Só aparece quando o setor teve algum no período. */}
      {mostrarResumo && resumoSetor && resumoSetor.quantidadeReparos > 0 && (
        <button
          type="button"
          onClick={aoVerReparos}
          disabled={!aoVerReparos}
          title="Ver os pequenos reparos deste setor"
          className="flex items-center gap-2 rounded-xl border-l-4 border-orange-400 bg-slate-50/50 px-3 py-2 text-left font-mono text-[11px] text-slate-600 enabled:cursor-pointer enabled:hover:bg-slate-100"
        >
          <Hammer size={12} className="shrink-0 text-orange-500" />
          <span className="font-semibold">Pequenos reparos</span>
          {resumoSetor.quantidadeReparos}{' '}
          {resumoSetor.quantidadeReparos === 1 ? 'reparo' : 'reparos'} ·{' '}
          {formatarMoeda(resumoSetor.custoReparos)}
          {aoVerReparos && <ChevronRight size={12} className="ml-auto shrink-0 text-slate-300" />}
        </button>
      )}

      {maquinas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200/60 px-4 py-3 text-xs text-slate-400">
          Nenhuma máquina neste setor.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {maquinas.map((maquina) => (
            <CardMaquina
              key={maquina.id}
              maquina={maquina}
              // Sem resumo com a loja já carregada = máquina sem OS no período.
              resumo={resumoSetor && resumoPorMaquina.get(maquina.id)}
              carregando={!resumoSetor}
              aoSelecionar={aoSelecionarMaquina}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function TituloSetor({ setorNome, fotoUrl }: { setorNome: string; fotoUrl?: string }) {
  return (
    <>
      {fotoUrl ? (
        <ImagemProgressiva
          src={fotoUrl}
          alt={setorNome}
          className="h-7 w-7 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span className="bg-marca-100 text-marca-600 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
          <Tag size={14} />
        </span>
      )}
      <h2 className="font-display truncate text-base font-bold text-slate-900">
        {setorNome}
      </h2>
    </>
  )
}

interface MetricaProps {
  rotulo: string
  valor: string | undefined
}

function Metrica({ rotulo, valor }: MetricaProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="truncate font-mono text-[10px] font-semibold text-slate-400 uppercase">
        {rotulo}
      </span>
      {valor === undefined ? (
        <Esqueleto className="h-5 w-16" />
      ) : (
        <span className="truncate font-mono text-sm font-bold text-slate-800 sm:text-base">
          {valor}
        </span>
      )}
    </div>
  )
}

interface CardMaquinaProps {
  maquina: Maquina
  resumo: ResumoIndicadores | undefined
  carregando: boolean
  aoSelecionar: (maquina: Maquina) => void
}

function CardMaquina({
  maquina,
  resumo,
  carregando,
  aoSelecionar,
}: CardMaquinaProps) {
  return (
    <button
      type="button"
      onClick={() => aoSelecionar(maquina)}
      className="group hover:border-marca-500/40 flex min-w-0 items-center gap-3 rounded-xl border border-slate-200/60 bg-white p-2.5 text-left transition-colors hover:bg-slate-50"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
        {maquina.fotoUrl ? (
          <ImagemProgressiva
            src={maquina.fotoUrl}
            alt={maquina.nome}
            className="h-full w-full object-cover"
          />
        ) : (
          <Wrench size={18} className="text-slate-400" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-sm font-bold text-slate-800">
          {maquina.nome}
        </p>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {maquina.numeroPatrimonio && (
            <span className="font-mono text-[10px] text-slate-400">
              {maquina.numeroPatrimonio}
            </span>
          )}
          {maquina.criticidade && (
            <BadgeCriticidade criticidade={maquina.criticidade} />
          )}
        </div>
        {carregando ? (
          <Esqueleto className="h-3 w-40" />
        ) : (
          <p className="truncate font-mono text-[11px] text-slate-500">
            {resumo && resumo.quantidadeOs + resumo.quantidadePreventivas > 0
              ? `${formatarHoras(resumo.horasParadaTotal)} parada · ${formatarMoeda(resumo.custoTotal)}${
                  // A preventiva vem à parte, como no painel: nunca somada ao custo da máquina.
                  resumo.quantidadePreventivas > 0
                    ? ` · prev. ${formatarMoeda(resumo.custoPreventivas)}`
                    : ''
                }`
              : 'Sem OS encerrada no período'}
          </p>
        )}
      </div>

      <ChevronRight
        size={16}
        className="group-hover:text-marca-600 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5"
      />
    </button>
  )
}
