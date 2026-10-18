import { useState } from 'react'
import { PackageSearch } from 'lucide-react'
import { CampoBusca } from '../../../componentes/CampoBusca'
import { Esqueleto } from '../../../componentes/Esqueleto'
import { useIndicadoresLoja } from '../../../hooks/useIndicadoresLoja'
import type { Maquina } from '../../../tipos/maquina'
import type { GrupoOrdensDoPainel, ResumoIndicadores } from '../../../tipos/indicadorMaquina'
import {
  montarBarrasMensais,
  RESUMO_ZERADO,
  resumoDoPeriodo,
} from '../periodoIndicadores'
import { BarraPeriodo } from './BarraPeriodo'
import { GraficoBarras } from './GraficoBarras'
import { EsqueletoGradeIndicadores, GradeIndicadores } from './GradeIndicadores'
import { ModalOrdensDaLoja } from './ModalOrdensDaLoja'
import { SecaoSetor } from './SecaoSetor'

export interface SetorComMaquinas {
  setorId: number
  setorNome: string
  // Foto de cadastro do setor (useSetores), para o título da seção.
  fotoUrl?: string
  maquinas: Maquina[]
}

interface PainelIndicadoresLojaProps {
  lojaId: number
  // Escopo 'todos': o total é da loja. Com só alguns setores, é a soma deles — o
  // servidor já recorta, a tela só precisa dizer isso no rótulo.
  acessoTotal: boolean
  setores: SetorComMaquinas[]
  aoSelecionarMaquina: (maquina: Maquina) => void
}

// Etapa da loja: o total (cards + custo mensal), e cada setor com os próprios
// indicadores e as máquinas dele. Dois filtros valem para a tela inteira:
//   - o SETOR escolhido nos chips do topo troca os cards e o gráfico pelos do setor e
//     deixa só as máquinas dele;
//   - o MÊS clicado no gráfico recorta loja/setor/máquinas, que trazem cada um o seu
//     porMes.
//
// Quem monta passa `key={lojaId}`: trocar de loja zera mês, busca e filtro de setor.
export function PainelIndicadoresLoja({
  lojaId,
  acessoTotal,
  setores,
  aoSelecionarMaquina,
}: PainelIndicadoresLojaProps) {
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [setorFiltro, setSetorFiltro] = useState<number | null>(null)
  // Lista por trás de um card aberta: de qual (maquinário, preventivas ou reparos), de qual setor (undefined = o
  // recorte do topo da tela) e com que rótulo.
  const [listaAberta, setListaAberta] = useState<{
    grupo: GrupoOrdensDoPainel
    setorId?: number
    rotulo: string
  } | null>(null)
  const { data: indicadores, isLoading: carregando } =
    useIndicadoresLoja(lojaId)

  // Fonte do bloco do topo: a loja, ou o setor escolhido nos chips. Setor sem máquina
  // não vem na resposta — sai zerado, com o gráfico vazio.
  const setorEscolhido = setores.find((setor) => setor.setorId === setorFiltro)
  const fonteTopo = setorEscolhido
    ? (indicadores?.porSetor.find(
        (setor) => setor.setorId === setorEscolhido.setorId,
      ) ?? (indicadores ? { ...RESUMO_ZERADO, porMes: [] } : undefined))
    : indicadores
  const resumoTopo = resumoDoPeriodo(fonteTopo, mesSelecionado)
  const tituloTopo = setorEscolhido
    ? `Setor ${setorEscolhido.setorNome}`
    : acessoTotal
      ? 'Total da loja'
      : 'Total dos seus setores'

  // Setor/máquina que não vêm na resposta (setor sem máquina) saem zerados — mas só
  // depois que a resposta chegou; antes disso, undefined vira esqueleto na tela.
  const resumoPorSetor = new Map<number, ResumoIndicadores>(
    indicadores?.porSetor.map((setor) => [
      setor.setorId,
      resumoDoPeriodo(setor, mesSelecionado) ?? RESUMO_ZERADO,
    ]),
  )
  const resumoPorMaquina = new Map<number, ResumoIndicadores>(
    indicadores?.porMaquina.map((maquina) => [
      maquina.maquinaId,
      resumoDoPeriodo(maquina, mesSelecionado) ?? RESUMO_ZERADO,
    ]),
  )

  const termo = busca.trim().toLowerCase()
  const setoresVisiveis = setores
    .filter((setor) => setorFiltro === null || setor.setorId === setorFiltro)
    .map((setor) => ({
      ...setor,
      maquinas: setor.maquinas.filter(
        (maquina) =>
          !termo ||
          maquina.nome.toLowerCase().includes(termo) ||
          maquina.numeroPatrimonio?.toLowerCase().includes(termo),
      ),
    }))
    // Com busca ativa, setor sem resultado só polui a tela.
    .filter((setor) => !termo || setor.maquinas.length > 0)

  const estiloChip = (ativo: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
      ativo
        ? 'bg-marca-600 text-white shadow-sm shadow-marca-600/20'
        : 'border border-slate-200/60 bg-white text-slate-600 hover:bg-slate-100'
    }`

  return (
    <div className="flex flex-col gap-6">
      {setores.length > 1 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            onClick={() => setSetorFiltro(null)}
            className={estiloChip(setorFiltro === null)}
          >
            Todos os setores
          </button>
          {setores.map((setor) => (
            <button
              key={setor.setorId}
              type="button"
              onClick={() => setSetorFiltro(setor.setorId)}
              className={estiloChip(setorFiltro === setor.setorId)}
            >
              {setor.setorNome}
            </button>
          ))}
        </div>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="font-display text-base font-bold text-slate-900">
            {tituloTopo}
          </h2>
          {resumoTopo && (
            <span className="font-mono text-[11px] text-slate-400">
              {resumoTopo.quantidadeOs}{' '}
              {resumoTopo.quantidadeOs === 1 ? 'OS de máquina encerrada' : 'OS de máquina encerradas'}
            </span>
          )}
        </div>

        {carregando && (
          <div
            role="status"
            aria-busy="true"
            aria-label="Carregando indicadores"
            className="flex flex-col gap-4"
          >
            <EsqueletoGradeIndicadores />
            <div className="shadow-card rounded-2xl bg-white p-5">
              <Esqueleto className="h-3 w-52" />
              <Esqueleto className="mt-4 h-40 w-full rounded-lg" />
            </div>
          </div>
        )}

        {fonteTopo && resumoTopo && (
          <>
            <BarraPeriodo
              mesSelecionado={mesSelecionado}
              aoLimpar={() => setMesSelecionado(null)}
            />
            <GradeIndicadores
              resumo={resumoTopo}
              mostrarReparos
              aoVerReparos={() =>
                setListaAberta({ grupo: 'reparos', setorId: setorEscolhido?.setorId, rotulo: tituloTopo })
              }
              mostrarPreventivas
              aoVerPreventivas={() =>
                setListaAberta({ grupo: 'preventivas', setorId: setorEscolhido?.setorId, rotulo: tituloTopo })
              }
              aoVerMaquinario={() =>
                setListaAberta({ grupo: 'maquinario', setorId: setorEscolhido?.setorId, rotulo: tituloTopo })
              }
            />
            <GraficoBarras
              titulo="Custo Mensal (últimos 12 meses)"
              dados={montarBarrasMensais(fonteTopo.porMes)}
              selecionada={mesSelecionado}
              aoSelecionar={(chave) =>
                setMesSelecionado((atual) => (atual === chave ? null : chave))
              }
            />
          </>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-base font-bold text-slate-900">
            {setorEscolhido ? 'Máquinas do setor' : 'Setores e máquinas'}
          </h2>
          <CampoBusca
            valor={busca}
            aoMudar={setBusca}
            placeholder="Buscar máquina por nome ou patrimônio..."
          />
        </div>

        {setoresVisiveis.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200/60 bg-white py-12 text-slate-400">
            <PackageSearch size={28} />
            <p className="text-sm">Nenhuma máquina encontrada.</p>
          </div>
        )}

        {setoresVisiveis.map((setor, indice) => (
          <SecaoSetor
            key={setor.setorId}
            setorNome={setor.setorNome}
            fotoUrl={setor.fotoUrl}
            maquinas={setor.maquinas}
            resumoSetor={
              indicadores
                ? (resumoPorSetor.get(setor.setorId) ?? RESUMO_ZERADO)
                : undefined
            }
            resumoPorMaquina={resumoPorMaquina}
            // Com o setor escolhido, os números dele já estão no topo da tela.
            mostrarResumo={!setorEscolhido}
            aoSelecionarSetor={
              setorEscolhido
                ? undefined
                : () => {
                    setSetorFiltro(setor.setorId)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }
            }
            atraso={indice * 40}
            aoSelecionarMaquina={aoSelecionarMaquina}
            aoVerReparos={() =>
              setListaAberta({ grupo: 'reparos', setorId: setor.setorId, rotulo: `Setor ${setor.setorNome}` })
            }
            aoVerPreventivas={() =>
              setListaAberta({ grupo: 'preventivas', setorId: setor.setorId, rotulo: `Setor ${setor.setorNome}` })
            }
            aoVerMaquinario={() =>
              setListaAberta({ grupo: 'maquinario', setorId: setor.setorId, rotulo: `Setor ${setor.setorNome}` })
            }
          />
        ))}
      </section>

      {listaAberta && (
        <ModalOrdensDaLoja
          lojaId={lojaId}
          grupo={listaAberta.grupo}
          setorId={listaAberta.setorId}
          // O mês clicado no gráfico vale para a lista, como vale para os números.
          mes={mesSelecionado ?? undefined}
          escopoRotulo={listaAberta.rotulo}
          aoFechar={() => setListaAberta(null)}
        />
      )}
    </div>
  )
}
