import { useEffect, useState } from 'react'
import { Inbox, SearchX } from 'lucide-react'
import { CabecalhoPagina } from '../../componentes/CabecalhoPagina'
import { useIdDaUrl } from '../../hooks/useIdDaUrl'
import { useSolicitacoes } from '../../hooks/useSolicitacoes'
import { servicoSolicitacoes } from '../../servicos/servicoSolicitacoes'
import type { SolicitacaoOS } from '../../tipos/ordemServico'
import { ModalDetalhesSolicitacao } from '../ModalDetalhesSolicitacao/ModalDetalhesSolicitacao'
import { Paginacao } from '../../componentes/Paginacao'
import { EsqueletoLista, EsqueletoCardOS } from '../../componentes/Esqueleto'
import { atrasoEntrada } from '../../utilitarios/atrasoEntrada'
import { BarraFiltros, type FiltroStatus } from './componentes/BarraFiltros'
import { CardSolicitacao } from './componentes/CardSolicitacao'
import { FiltroMaquinas } from './componentes/FiltroMaquinas'

const ATRASO_DEBOUNCE_BUSCA_MS = 400

export function MinhasSolicitacoes() {
  const [buscaInput, setBuscaInput] = useState('')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<FiltroStatus>('Todos')
  const [maquinaId, setMaquinaId] = useState<number>()
  const [pagina, setPagina] = useState(1)
  const [solicitacaoParaVisualizar, setSolicitacaoParaVisualizar] =
    useState<SolicitacaoOS | null>(null)

  // Link de notificação (sininho/push): ?solicitacao=N -- o pedido que o Gestor aceitou
  // ou rejeitou. Abre o detalhe, que mostra o status novo e, se rejeitado, o motivo.
  const [solicitacaoDaUrl, consumirSolicitacaoDaUrl] = useIdDaUrl('solicitacao')

  useEffect(() => {
    if (solicitacaoDaUrl === null) {
      return
    }
    consumirSolicitacaoDaUrl()
    // Não encontrada: o api.ts já mostra o toast do 404.
    servicoSolicitacoes
      .obterPorId(solicitacaoDaUrl)
      .then(setSolicitacaoParaVisualizar)
      .catch(() => {})
  }, [solicitacaoDaUrl, consumirSolicitacaoDaUrl])

  useEffect(() => {
    const temporizador = setTimeout(() => {
      setBusca(buscaInput)
      setPagina(1)
    }, ATRASO_DEBOUNCE_BUSCA_MS)

    return () => clearTimeout(temporizador)
  }, [buscaInput])

  function aoSelecionarFiltro(novoFiltro: FiltroStatus) {
    setFiltro(novoFiltro)
    setPagina(1)
  }

  function aoSelecionarMaquina(novaMaquinaId: number | undefined) {
    setMaquinaId(novaMaquinaId)
    setPagina(1)
  }

  const { data, isLoading, isError, isFetching } = useSolicitacoes({
    pagina,
    busca: busca || undefined,
    status: filtro === 'Todos' ? undefined : filtro,
    maquinaId,
  })

  const solicitacoes = data?.dados ?? []

  return (
    <div className="flex min-h-svh flex-col bg-slate-50">
      <CabecalhoPagina titulo="Minhas Solicitações" />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-6 sm:px-8">
        <BarraFiltros
          busca={buscaInput}
          aoMudarBusca={setBuscaInput}
          filtroSelecionado={filtro}
          aoSelecionarFiltro={aoSelecionarFiltro}
        />

        <FiltroMaquinas maquinaSelecionada={maquinaId} aoSelecionar={aoSelecionarMaquina} />

        {!isLoading && !isError && (
          <p className="text-sm text-slate-500">
            {data?.total ?? 0} solicitação(ões) encontrada(s)
          </p>
        )}

        <div
          className={`flex flex-1 flex-col gap-3 transition-opacity ${
            isFetching ? 'opacity-60' : 'opacity-100'
          }`}
        >
          {isLoading && (
            <EsqueletoLista quantidade={4}>
              <EsqueletoCardOS />
            </EsqueletoLista>
          )}

          {isError && (
            <p className="rounded-2xl border-2 border-dashed border-slate-200/60 bg-white py-10 text-center text-sm text-slate-400">
              Não foi possível carregar as solicitações.
            </p>
          )}

          {!isLoading && !isError && solicitacoes.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200/60 bg-white py-12 text-slate-400">
              {busca || filtro !== 'Todos' || maquinaId !== undefined ? (
                <SearchX size={28} />
              ) : (
                <Inbox size={28} />
              )}
              <p className="text-sm">Nenhuma solicitação encontrada.</p>
            </div>
          )}

          {solicitacoes.map((solicitacao, indice) => (
            <div
              key={solicitacao.id}
              style={atrasoEntrada(indice)}
              className="animate-surgir"
            >
              <CardSolicitacao solicitacao={solicitacao} />
            </div>
          ))}
        </div>

        {!isLoading && !isError && data && data.totalPaginas > 1 && (
          <Paginacao
            pagina={data.pagina}
            totalPaginas={data.totalPaginas}
            aoMudarPagina={setPagina}
          />
        )}
      </main>

      <footer className="py-4 text-center">
        <span className="font-mono text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
          Solicitação OS © {new Date().getFullYear()}
        </span>
      </footer>

      {solicitacaoParaVisualizar && (
        <ModalDetalhesSolicitacao
          solicitacao={solicitacaoParaVisualizar}
          contexto="Minhas Solicitações"
          aoFechar={() => setSolicitacaoParaVisualizar(null)}
        />
      )}
    </div>
  )
}
