import { useState } from 'react'
import { Wrench } from 'lucide-react'
import { Esqueleto } from '../../../componentes/Esqueleto'
import { ImagemProgressiva } from '../../../componentes/ImagemProgressiva'
import { useIndicadoresMaquina } from '../../../hooks/useIndicadoresMaquina'
import { formatarHoras } from '../../../utilitarios/formatarHoras'
import type { Maquina } from '../../../tipos/maquina'
import { CORES_TIPO_DEFEITO } from '../coresTipoDefeito'
import { montarBarrasMensais, resumoDoPeriodo } from '../periodoIndicadores'
import { BadgeCriticidade } from './BadgeCriticidade'
import { BarraPeriodo } from './BarraPeriodo'
import { GraficoBarras } from './GraficoBarras'
import { GraficoRosca } from './GraficoRosca'
import { EsqueletoGradeIndicadores, GradeIndicadores } from './GradeIndicadores'
import { ModalOrdensDaLoja } from './ModalOrdensDaLoja'

interface PainelIndicadoresMaquinaProps {
  maquina: Maquina
}

// Quem monta este painel passa `key={maquina.id}`: trocar de máquina recria o
// componente e zera o mês escolhido — o mês da máquina anterior não diz nada sobre esta.
export function PainelIndicadoresMaquina({
  maquina,
}: PainelIndicadoresMaquinaProps) {
  // "MM/YYYY" do mês clicado no gráfico; null mostra o histórico inteiro.
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null)
  // Lista das OS desta máquina aberta: a do card de custo (maquinário) ou a da faixa de
  // preventivas.
  const [listaAberta, setListaAberta] = useState<'maquinario' | 'preventivas' | null>(null)
  const { data: indicadores, isLoading: carregandoIndicadores } =
    useIndicadoresMaquina(maquina.id)

  const resumo = resumoDoPeriodo(indicadores, mesSelecionado)

  const segmentosRosca =
    resumo?.porTipoDefeito.map((item) => ({
      rotulo: item.tipoDefeito,
      valor: item.horasParada,
      valorFormatado: formatarHoras(item.horasParada),
      cor: CORES_TIPO_DEFEITO[item.tipoDefeito],
    })) ?? []

  const detalhes = [
    maquina.numeroPatrimonio,
    [maquina.marca, maquina.modelo].filter(Boolean).join(' '),
  ].filter(Boolean)

  return (
    <div className="flex flex-col gap-4">
      <div className="shadow-card animate-surgir flex min-w-0 items-center gap-4 rounded-2xl bg-white p-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 sm:h-24 sm:w-24">
          {maquina.fotoUrl ? (
            <ImagemProgressiva
              src={maquina.fotoUrl}
              alt={maquina.nome}
              className="h-full w-full object-cover"
            />
          ) : (
            <Wrench size={24} className="text-slate-400" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="font-display text-lg font-bold break-words text-slate-900 sm:text-xl">
            {maquina.nome}
          </h2>
          <p className="truncate text-xs text-slate-500">
            {maquina.setorNome}
            {maquina.lojaNome && ` · ${maquina.lojaNome}`}
          </p>
          {detalhes.length > 0 && (
            <p className="truncate font-mono text-[11px] text-slate-400">
              {detalhes.join(' · ')}
            </p>
          )}
          {maquina.criticidade && (
            <div className="mt-0.5">
              <BadgeCriticidade criticidade={maquina.criticidade} />
            </div>
          )}
        </div>
      </div>

      {/* Esqueleto no formato exato do painel (4 indicadores + rosca + barras):
          quando os números chegam nada muda de lugar. */}
      {carregandoIndicadores && (
        <div role="status" aria-busy="true" aria-label="Carregando indicadores">
          <EsqueletoGradeIndicadores />
          <div className="shadow-card mt-4 rounded-2xl bg-white p-5">
            <Esqueleto className="h-3 w-52" />
            <Esqueleto className="mt-4 h-40 w-full rounded-lg" />
          </div>
          <div className="shadow-card mt-4 flex flex-col items-center gap-4 rounded-2xl bg-white p-5">
            <Esqueleto className="h-3 w-44" />
            <Esqueleto className="h-40 w-40 rounded-full" />
          </div>
        </div>
      )}

      {indicadores && resumo && (
        <>
          <BarraPeriodo
            mesSelecionado={mesSelecionado}
            aoLimpar={() => setMesSelecionado(null)}
          />

          <GradeIndicadores
            resumo={resumo}
            aoVerMaquinario={() => setListaAberta('maquinario')}
            mostrarPreventivas
            aoVerPreventivas={() => setListaAberta('preventivas')}
          />

          <GraficoBarras
            titulo="Custo Mensal (últimos 12 meses)"
            dados={montarBarrasMensais(indicadores.porMes)}
            selecionada={mesSelecionado}
            aoSelecionar={(chave) =>
              setMesSelecionado((atual) => (atual === chave ? null : chave))
            }
          />

          <GraficoRosca
            titulo="Paradas por Tipo de OS"
            subtitulo="Horas de máquina parada, por tipo de serviço"
            dados={segmentosRosca}
            rotuloCentral="Parada total"
            valorCentral={formatarHoras(resumo.horasParadaTotal)}
          />
        </>
      )}

      {listaAberta && (
        <ModalOrdensDaLoja
          lojaId={maquina.lojaId}
          grupo={listaAberta}
          maquinaId={maquina.id}
          // O mês clicado no gráfico vale para a lista, como vale para os números.
          mes={mesSelecionado ?? undefined}
          escopoRotulo={maquina.nome}
          aoFechar={() => setListaAberta(null)}
        />
      )}
    </div>
  )
}
