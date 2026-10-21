import { Gauge, PackageSearch } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { CabecalhoSubpagina } from '../../componentes/CabecalhoSubpagina'
import { Esqueleto } from '../../componentes/Esqueleto'
import { useEstadoAutenticacao } from '../../estado/estadoAutenticacao'
import { useMaquinas } from '../../hooks/useMaquinas'
import { useLojas } from '../../hooks/useLojas'
import { useSetores } from '../../hooks/useSetores'
import { agruparPorEscopoGestor } from '../../utilitarios/acessoGestor'
import type { Maquina } from '../../tipos/maquina'
import {
  PainelIndicadoresLoja,
  type SetorComMaquinas,
} from './componentes/PainelIndicadoresLoja'
import { PainelIndicadoresMaquina } from './componentes/PainelIndicadoresMaquina'
import { SeletorLoja, type ResumoLoja } from './componentes/SeletorLoja'
import {
  TrilhaNavegacao,
  type EtapaTrilha,
} from './componentes/TrilhaNavegacao'

// Três etapas: Lojas → Loja (total, setores e máquinas com os indicadores de cada um)
// → Indicadores de uma máquina. A etapa vive na URL
// (?loja=&maquina=), e não em useState, para o botão "voltar" do navegador e o F5
// devolverem o Gestor para onde ele estava.
export function DashboardGestor() {
  const escoposGestor =
    useEstadoAutenticacao((estado) => estado.escoposGestor) ?? []
  const { data: lojas = [] } = useLojas()
  const { data: setores = [] } = useSetores()
  const { data: maquinas = [], isLoading: carregandoMaquinas } = useMaquinas()
  const [parametros, setParametros] = useSearchParams()

  const grupos = agruparPorEscopoGestor(maquinas, escoposGestor, lojas, setores)

  // Setores de cada loja com as máquinas dentro. Escopo 'todos' chega como um subgrupo
  // só (sem setor) e é aberto aqui pelos setores cadastrados da loja — inclusive os sem
  // máquina, para o Gestor ver que o setor existe e está vazio.
  const setoresPorLoja = new Map<number, SetorComMaquinas[]>(
    grupos.map((grupo) => {
      const lista = grupo.subgrupos.flatMap((subgrupo) =>
        subgrupo.setorId === null
          ? setores
              .filter((setor) => setor.lojaId === grupo.loja.id)
              .map((setor) => ({
                setorId: setor.id,
                setorNome: setor.nome,
                fotoUrl: setor.fotoUrl,
                maquinas: subgrupo.itens.filter(
                  (maquina) => maquina.setorId === setor.id,
                ),
              }))
          : [
              {
                setorId: subgrupo.setorId,
                setorNome: subgrupo.setorNome ?? `Setor ${subgrupo.setorId}`,
                fotoUrl: setores.find((setor) => setor.id === subgrupo.setorId)?.fotoUrl,
                maquinas: subgrupo.itens,
              },
            ],
      )
      lista.sort((a, b) => a.setorNome.localeCompare(b.setorNome, 'pt-BR'))
      return [grupo.loja.id, lista]
    }),
  )

  const resumosLojas: ResumoLoja[] = grupos.map((grupo) => {
    const setoresDaLoja = setoresPorLoja.get(grupo.loja.id) ?? []
    const maquinasDaLoja = setoresDaLoja.flatMap((setor) => setor.maquinas)
    return {
      loja: grupo.loja,
      quantidadeMaquinas: maquinasDaLoja.length,
      quantidadeSetores: setoresDaLoja.length,
      quantidadeCriticas: maquinasDaLoja.filter(
        (maquina) => maquina.criticidade === 'Alta',
      ).length,
      acessoTotal: grupo.subgrupos.some(
        (subgrupo) => subgrupo.setorId === null,
      ),
    }
  })

  const maquinasDisponiveis = [...setoresPorLoja.values()]
    .flat()
    .flatMap((setor) => setor.maquinas)

  // Parâmetro inválido (máquina fora do escopo, id digitado à mão) cai na etapa
  // anterior em vez de mostrar uma tela vazia.
  const maquinaSelecionada: Maquina | null =
    maquinasDisponiveis.find(
      (maquina) => maquina.id === Number(parametros.get('maquina')),
    ) ?? null
  const umaLojaSo = resumosLojas.length === 1
  const lojaSelecionada =
    resumosLojas.find(
      (resumo) =>
        resumo.loja.id ===
        (maquinaSelecionada?.lojaId ?? Number(parametros.get('loja'))),
    ) ?? (umaLojaSo ? resumosLojas[0] : null)

  function irPara(lojaId: number | null, maquinaId: number | null = null) {
    const novos = new URLSearchParams()
    if (lojaId !== null) novos.set('loja', String(lojaId))
    if (maquinaId !== null) novos.set('maquina', String(maquinaId))
    setParametros(novos)
    window.scrollTo({ top: 0 })
  }

  const trilha: EtapaTrilha[] = []
  if (!umaLojaSo) {
    trilha.push({
      rotulo: 'Lojas',
      aoClicar: lojaSelecionada ? () => irPara(null) : undefined,
    })
  }
  if (lojaSelecionada) {
    trilha.push({
      rotulo: lojaSelecionada.loja.nome,
      aoClicar: maquinaSelecionada
        ? () => irPara(lojaSelecionada.loja.id)
        : undefined,
    })
  }
  if (maquinaSelecionada) {
    trilha.push({ rotulo: maquinaSelecionada.nome })
  }

  const titulo = maquinaSelecionada
    ? 'Indicadores da Máquina'
    : lojaSelecionada
      ? lojaSelecionada.loja.nome
      : 'Indicadores de Máquinas'
  const subtitulo = maquinaSelecionada
    ? 'Horas Parada, MTTR, MTBF e Custo Total a partir das OS encerradas.'
    : lojaSelecionada
      ? 'Horas Parada, MTTR, MTBF e Custo Total por setor. Clique numa máquina para ver o detalhe dela.'
      : 'Escolha a loja para ver os indicadores dos setores e das máquinas.'

  return (
    <div className="flex min-h-svh flex-col bg-slate-50">
      <CabecalhoSubpagina
        contexto="Painel do Gestor"
        titulo="Painel de Indicadores"
        Icone={Gauge}
      />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-6 sm:px-8">
        <div className="flex flex-col gap-2">
          {trilha.length > 1 && <TrilhaNavegacao etapas={trilha} />}
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {titulo}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>
          </div>
        </div>

        {carregandoMaquinas && (
          <div
            role="status"
            aria-busy="true"
            aria-label="Carregando lojas"
            className="grid gap-3 sm:grid-cols-2"
          >
            {Array.from({ length: 2 }, (_, indice) => (
              <div
                key={indice}
                className="shadow-card flex flex-col gap-4 rounded-2xl bg-white p-5"
              >
                <div className="flex items-center gap-3">
                  <Esqueleto className="h-11 w-11 rounded-xl" />
                  <div className="flex flex-col gap-2">
                    <Esqueleto className="h-4 w-32" />
                    <Esqueleto className="h-3 w-24" />
                  </div>
                </div>
                <Esqueleto className="h-14 w-full rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {!carregandoMaquinas && resumosLojas.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200/60 bg-white py-12 text-slate-400">
            <PackageSearch size={28} className="text-slate-400" />
            <p className="text-sm">Nenhuma loja vinculada ao seu acesso.</p>
          </div>
        )}

        {!carregandoMaquinas && !lojaSelecionada && resumosLojas.length > 0 && (
          <SeletorLoja
            lojas={resumosLojas}
            aoSelecionar={(lojaId) => irPara(lojaId)}
          />
        )}

        {!carregandoMaquinas && lojaSelecionada && !maquinaSelecionada && (
          <PainelIndicadoresLoja
            // key: mês, busca e filtro de setor são da loja; trocar de loja zera os três.
            key={lojaSelecionada.loja.id}
            lojaId={lojaSelecionada.loja.id}
            acessoTotal={lojaSelecionada.acessoTotal}
            setores={setoresPorLoja.get(lojaSelecionada.loja.id) ?? []}
            aoSelecionarMaquina={(maquina) =>
              irPara(maquina.lojaId, maquina.id)
            }
          />
        )}

        {maquinaSelecionada && (
          <PainelIndicadoresMaquina
            key={maquinaSelecionada.id}
            maquina={maquinaSelecionada}
          />
        )}
      </main>
    </div>
  )
}
