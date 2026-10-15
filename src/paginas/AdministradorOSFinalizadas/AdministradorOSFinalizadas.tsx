import { useState } from 'react'
import { ClipboardCheck, Eye, Printer } from 'lucide-react'
import { CabecalhoSubpagina } from '../../componentes/CabecalhoSubpagina'
import { BadgeTipoOS } from '../../componentes/BadgeTipoOS'
import { CampoBusca } from '../../componentes/CampoBusca'
import { CampoSelecao } from '../../componentes/CampoSelecao'
import { FiltroTipoOS } from '../../componentes/FiltroTipoOS'
import { Paginacao } from '../../componentes/Paginacao'
import { EsqueletoLista, EsqueletoCardOS } from '../../componentes/Esqueleto'
import { useLojas } from '../../hooks/useLojas'
import { useSetores } from '../../hooks/useSetores'
import { useOrdensServicoPaginadas } from '../../hooks/useOrdensServicoPaginadas'
import { obterNomeAlvo } from '../../utilitarios/alvoOS'
import { atrasoEntrada } from '../../utilitarios/atrasoEntrada'
import { formatarDataHora } from '../../utilitarios/formatarData'
import { formatarMoeda } from '../../utilitarios/formatarMoeda'
import type { OrdemServico, TipoOS } from '../../tipos/ordemServico'
import { ModalDetalhesOS } from '../ModalDetalhesOS/ModalDetalhesOS'

interface SelecaoOS {
  ordem: OrdemServico
  imprimir: boolean
}

export function AdministradorOSFinalizadas() {
  const [busca, setBusca] = useState('')
  const [filtroLoja, setFiltroLoja] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<TipoOS | ''>('')
  const [selecao, setSelecao] = useState<SelecaoOS | null>(null)
  const [pagina, setPagina] = useState(1)

  // "Finalizada" = Técnico encerrou E o custo foi lançado. O servidor resolve essa regra
  // e também pagina (12 por página): é histórico, só cresce — trazer tudo para paginar no
  // cliente era o primeiro ponto a pesar com o tempo.
  const { data, isLoading, isFetching } = useOrdensServicoPaginadas({
    pagina,
    finalizada: true,
    busca: busca.trim() || undefined,
    lojaId: filtroLoja ? Number(filtroLoja) : undefined,
    setorId: filtroSetor ? Number(filtroSetor) : undefined,
    tipo: filtroTipo || undefined,
  })
  const { data: lojas = [] } = useLojas()
  // Setores da loja escolhida — sem loja, todos. Mesmo par de AdministradorMaquinas.
  const { data: setores = [] } = useSetores(
    filtroLoja ? Number(filtroLoja) : undefined,
  )

  // Trocar de loja invalida o setor escolhido: ele é de outra loja, não estaria na nova
  // lista e o filtro devolveria zero resultados com o select em branco.
  function aoMudarLoja(novaLoja: string) {
    setFiltroLoja(novaLoja)
    setFiltroSetor('')
  }

  const chaveFiltros = `${busca}|${filtroLoja}|${filtroSetor}|${filtroTipo}`
  const [chaveFiltrosAnterior, setChaveFiltrosAnterior] = useState(chaveFiltros)
  if (chaveFiltros !== chaveFiltrosAnterior) {
    setChaveFiltrosAnterior(chaveFiltros)
    setPagina(1)
  }

  const ordensPaginadas = data?.dados ?? []
  const totalPaginas = Math.max(1, data?.totalPaginas ?? 1)
  // O servidor não segura a página no total: se a lista encolheu (filtro, OS que saiu),
  // uma página além da última voltaria vazia. Volta para a última que existe.
  if (data && pagina > totalPaginas) {
    setPagina(totalPaginas)
  }

  return (
    <div className="flex min-h-svh flex-col bg-slate-50">
      <CabecalhoSubpagina
        contexto="Painel do Administrador"
        titulo="OS Finalizadas"
        Icone={ClipboardCheck}
      />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-6 sm:px-8 lg:max-w-6xl 2xl:max-w-[88rem]">
        <p className="text-sm text-slate-500">
          Ordens de serviço concluídas e com todos os dados preenchidos, incluindo o custo de
          manutenção já lançado.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <CampoBusca
            valor={busca}
            aoMudar={setBusca}
            placeholder="Buscar por máquina ou código..."
          />

          <div className="sm:w-56 sm:shrink-0">
            <CampoSelecao
              rotulo="Loja"
              value={filtroLoja}
              onChange={(evento) => aoMudarLoja(evento.target.value)}
            >
              <option value="">Todas as lojas</option>
              {lojas.map((loja) => (
                <option key={loja.id} value={loja.id}>
                  {loja.nome}
                </option>
              ))}
            </CampoSelecao>
          </div>

          <div className="sm:w-56 sm:shrink-0">
            <CampoSelecao
              rotulo="Setor"
              value={filtroSetor}
              onChange={(evento) => setFiltroSetor(evento.target.value)}
            >
              <option value="">Todos os setores</option>
              {setores.map((setor) => (
                <option key={setor.id} value={setor.id}>
                  {setor.nome}
                </option>
              ))}
            </CampoSelecao>
          </div>

          <div className="sm:w-56 sm:shrink-0">
            <FiltroTipoOS valor={filtroTipo} aoMudar={setFiltroTipo} />
          </div>
        </div>

        {!isLoading && data && (
          <p className="text-sm text-slate-500">{data.total} OS finalizada(s)</p>
        )}

        <div
          className={`flex flex-1 flex-col gap-3 transition-opacity lg:grid lg:grid-cols-2 2xl:grid-cols-3 lg:content-start lg:gap-4 ${
            isFetching && !isLoading ? 'opacity-60' : 'opacity-100'
          }`}
        >
          {isLoading && (
            <EsqueletoLista quantidade={4}>
              <EsqueletoCardOS />
            </EsqueletoLista>
          )}

          {!isLoading && ordensPaginadas.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200/60 bg-white py-12 text-slate-400 lg:col-span-2">
              <ClipboardCheck size={28} />
              <p className="text-sm">Nenhuma OS finalizada encontrada para esses filtros.</p>
            </div>
          )}

          {ordensPaginadas.map((ordem, indice) => {
            const custoTotal = (ordem.custo?.custoHoraTecnico ?? 0) + (ordem.custo?.custoManutencao ?? 0)

            return (
              <div
                key={ordem.id}
                style={atrasoEntrada(indice)}
                className="animate-surgir flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-card transition-shadow duration-200 hover:shadow-card-hover sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  {/* Uma linha só: sem flex-wrap o badge nunca cai para a linha de baixo. */}
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-marca-600 font-mono text-sm font-bold text-white">
                      #{ordem.id}
                    </span>
                    <span className="truncate font-semibold text-slate-800">
                      {obterNomeAlvo(ordem)}
                    </span>
                    {ordem.maquinaCodigo && (
                      <span className="shrink-0 font-mono text-sm text-slate-400">
                        · {ordem.maquinaCodigo}
                      </span>
                    )}
                    <BadgeTipoOS tipo={ordem.tipo} />
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-400">
                    {lojas.find((loja) => loja.id === ordem.lojaId)?.nome ?? ordem.lojaId} ·{' '}
                    {ordem.setorNome} · Encerrada em{' '}
                    {ordem.dataFim ? formatarDataHora(ordem.dataFim) : '—'}
                  </p>
                  <p className="mt-1 font-mono text-xs font-semibold text-emerald-700">
                    Custo Total: {formatarMoeda(custoTotal)}
                  </p>
                </div>

                <div className="flex gap-2 sm:shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelecao({ ordem, imprimir: false })}
                    aria-label="Visualizar OS"
                    className="flex items-center justify-center rounded-xl bg-slate-100 px-3.5 py-2.5 text-slate-600 shadow-sm transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-marca-500"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelecao({ ordem, imprimir: true })}
                    aria-label="Imprimir OS"
                    className="flex items-center justify-center rounded-xl bg-slate-100 px-3.5 py-2.5 text-slate-600 shadow-sm transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-marca-500"
                  >
                    <Printer size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {totalPaginas > 1 && (
          <Paginacao pagina={pagina} totalPaginas={totalPaginas} aoMudarPagina={setPagina} />
        )}
      </main>

      {selecao && (
        <ModalDetalhesOS
          ordemServico={selecao.ordem}
          autoImprimir={selecao.imprimir}
          aoFechar={() => setSelecao(null)}
        />
      )}
    </div>
  )
}
