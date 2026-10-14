import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import { toast } from 'react-toastify'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CabecalhoTopo } from '../../componentes/CabecalhoTopo'
import { FiltroTipoOS } from '../../componentes/FiltroTipoOS'
import { useEstadoAutenticacao } from '../../estado/estadoAutenticacao'
import { useIdDaUrl } from '../../hooks/useIdDaUrl'
import { useTodasSolicitacoes } from '../../hooks/useTodasSolicitacoes'
import { useOrdensServicoTodas } from '../../hooks/useOrdensServicoTodas'
import { usePreventivas } from '../../hooks/usePreventivas'
import { useLojas } from '../../hooks/useLojas'
import { servicoSolicitacoes } from '../../servicos/servicoSolicitacoes'
import { dataEstaNoIntervalo } from '../../utilitarios/dataEstaNoIntervalo'
import { obterNomeAlvo } from '../../utilitarios/alvoOS'
import type {
  OrdemServico,
  SolicitacaoOS,
  TipoOS,
} from '../../tipos/ordemServico'
import { ModalAbrirOrdemServico } from '../ModalAbrirOrdemServico/ModalAbrirOrdemServico'
import type { DadosAbrirOrdemServico } from '../ModalAbrirOrdemServico/esquemaAbrirOrdemServico'
import { ModalDetalhesOS } from '../ModalDetalhesOS/ModalDetalhesOS'
import { ModalDetalhesSolicitacao } from '../ModalDetalhesSolicitacao/ModalDetalhesSolicitacao'
import { AbasPainelGestor } from './componentes/AbasPainelGestor'
import { ABAS_PAINEL_GESTOR, type AbaPainelGestor } from './abasPainelGestor'
import { AcoesRapidas } from './componentes/AcoesRapidas'
import { CardSolicitacaoGestor } from './componentes/CardSolicitacaoGestor'
import {
  FiltroStatusSolicitacao,
  type StatusFilaGestor,
} from './componentes/FiltroStatusSolicitacao'
import { CardOSEmExecucao } from './componentes/CardOSEmExecucao'
import { CardOSFinalizada } from './componentes/CardOSFinalizada'
import { ModalRejeitarSolicitacao } from './componentes/ModalRejeitarSolicitacao'
import { SeletorPreventivas } from './componentes/SeletorPreventivas'
import { NavegacaoLojaSetor } from '../../componentes/NavegacaoLojaSetor'
import type { DadosRejeitarSolicitacao } from './esquemaRejeitarSolicitacao'
import { ModalFiltrosOS } from './componentes/ModalFiltrosOS'
import {
  FILTROS_AVANCADOS_OS_VAZIOS,
  type FiltrosAvancadosOS,
} from './filtrosOS'

// Só a lista de um setor pagina: OS Finalizadas é histórico e cresce sem parar.
const TAMANHO_PAGINA_FINALIZADAS = 12

function rotuloOS(quantidade: number) {
  return quantidade === 1 ? '1 OS' : `${quantidade} OS`
}

// Selo vermelho dos cards de loja/setor: máquina parada é o que o Gestor ataca primeiro.
function rotuloAfetaProducao(quantidade: number) {
  return quantidade === 1 ? '1 afeta produção' : `${quantidade} afetam produção`
}

interface SelecaoOS {
  ordem: OrdemServico
  imprimir: boolean
}

export function PainelGestor() {
  const queryClient = useQueryClient()
  const escoposGestor =
    useEstadoAutenticacao((estado) => estado.escoposGestor) ?? []
  const { data: lojas = [] } = useLojas()
  // A aba mora na URL (?aba=), junto com os níveis de loja/setor das abas navegáveis
  // (utilitarios/navegacaoNiveis.ts): o F5 e o voltar do navegador reabrem onde o Gestor estava, e
  // duas abas usando `loja`/`setor` não herdam o caminho uma da outra.
  const [parametros, setParametros] = useSearchParams()
  const abaDaUrl = parametros.get('aba')
  const abaSelecionada: AbaPainelGestor =
    ABAS_PAINEL_GESTOR.find((aba) => aba === abaDaUrl) ?? 'solicitacoes'

  // Trocar de aba começa do topo dela: os níveis da aba anterior não valem aqui.
  function aoSelecionarAba(aba: AbaPainelGestor) {
    setParametros({ aba })
  }
  const [filtroTipo, setFiltroTipo] = useState<TipoOS | ''>('')
  const [filtroStatus, setFiltroStatus] = useState<StatusFilaGestor>('Pendente')
  const [filtrosAvancados, setFiltrosAvancados] = useState<FiltrosAvancadosOS>(
    FILTROS_AVANCADOS_OS_VAZIOS,
  )
  const [modalFiltrosAberto, setModalFiltrosAberto] = useState(false)
  const [solicitacaoParaAbrirOS, setSolicitacaoParaAbrirOS] =
    useState<SolicitacaoOS | null>(null)
  const [solicitacaoParaRejeitar, setSolicitacaoParaRejeitar] =
    useState<SolicitacaoOS | null>(null)
  const [solicitacaoParaVisualizar, setSolicitacaoParaVisualizar] =
    useState<SolicitacaoOS | null>(null)
  const [selecaoOS, setSelecaoOS] = useState<SelecaoOS | null>(null)

  // Só a lista da aba aberta é buscada: abrir o painel não baixa as quatro de uma vez.
  // A que já foi vista fica no cache, então voltar a uma aba é instantâneo. As duas
  // abas de OS dividem a mesma lista.
  const abaDeOS =
    abaSelecionada === 'os-em-andamento' || abaSelecionada === 'os-finalizadas'
  const { data: solicitacoes = [], isLoading: carregandoSolicitacoes } =
    useTodasSolicitacoes({}, abaSelecionada === 'solicitacoes')
  const {
    data: ordensServico = [],
    isLoading: carregandoOrdensServico,
    refetch: recarregarOrdensServico,
  } = useOrdensServicoTodas({}, abaDeOS)
  const { data: preventivas = [], isLoading: carregandoPreventivas } =
    usePreventivas(undefined, abaSelecionada === 'manutencao-preventiva')

  // Link de notificação (sininho/push): ?solicitacao=N abre o detalhe do pedido na aba
  // de solicitações; ?os=N abre o detalhe da OS (a concluída, que o Técnico acabou de
  // encerrar). O parâmetro sai da URL antes da busca: o modal abre uma vez só.
  const [solicitacaoDaUrl] = useIdDaUrl('solicitacao')
  const [osDaUrl, consumirOSDaUrl] = useIdDaUrl('os')

  useEffect(() => {
    if (solicitacaoDaUrl === null) {
      return
    }
    // Trocar pra aba de solicitações já tira o ?solicitacao= (setParametros substitui
    // a query inteira): o card do pedido fica atrás do modal, pronto pra Abrir OS.
    setParametros({ aba: 'solicitacoes' }, { replace: true })
    // Não encontrada (fora do escopo, já apagada): o api.ts já mostra o toast do 404.
    servicoSolicitacoes
      .obterPorId(solicitacaoDaUrl)
      .then(setSolicitacaoParaVisualizar)
      .catch(() => {})
  }, [solicitacaoDaUrl, setParametros])

  useEffect(() => {
    if (osDaUrl === null) {
      return
    }
    consumirOSDaUrl()
    // Não há GET /ordens-servico/:id: a OS sai da lista do escopo, buscada de novo
    // (refetch ignora o `habilitado`) pra não abrir uma versão de antes do encerramento.
    recarregarOrdensServico().then(({ data }) => {
      const ordem = data?.find((item) => item.id === osDaUrl)
      if (ordem) {
        setSelecaoOS({ ordem, imprimir: false })
      } else {
        toast.info(`A OS #${osDaUrl} não está mais no seu painel.`)
      }
    })
  }, [osDaUrl, consumirOSDaUrl, recarregarOrdensServico])

  async function invalidarSolicitacoesEOrdens() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-os-todas'] }),
      queryClient.invalidateQueries({ queryKey: ['ordens-servico-todas'] }),
    ])
  }

  const { mutateAsync: abrirOS } = useMutation({
    mutationFn: servicoSolicitacoes.abrirOS,
    onSuccess: invalidarSolicitacoesEOrdens,
  })

  // Rejeitar não cria OrdemServico, mas invalida as duas listas do mesmo jeito: a
  // solicitação sai da fila de pendentes do Gestor.
  const { mutateAsync: rejeitar } = useMutation({
    mutationFn: servicoSolicitacoes.rejeitar,
    onSuccess: invalidarSolicitacoesEOrdens,
  })

  async function aoConfirmarAberturaOS(dados: DadosAbrirOrdemServico) {
    if (!solicitacaoParaAbrirOS) {
      return
    }

    await abrirOS({ solicitacaoId: solicitacaoParaAbrirOS.id, ...dados })
    toast.success(`OS aberta para a solicitação #${solicitacaoParaAbrirOS.id}.`)
  }

  async function aoConfirmarRejeicao(dados: DadosRejeitarSolicitacao) {
    if (!solicitacaoParaRejeitar) {
      return
    }

    await rejeitar({ solicitacaoId: solicitacaoParaRejeitar.id, ...dados })
    toast.success(`Solicitação #${solicitacaoParaRejeitar.id} rejeitada.`)
  }

  const valorMinimoFiltro =
    filtrosAvancados.valorMinimo === ''
      ? undefined
      : Number(filtrosAvancados.valorMinimo)
  const valorMaximoFiltro =
    filtrosAvancados.valorMaximo === ''
      ? undefined
      : Number(filtrosAvancados.valorMaximo)
  const temFiltroDeValor =
    valorMinimoFiltro !== undefined || valorMaximoFiltro !== undefined

  // Aplica Loja/Máquina/Período/Valor (filtro avançado do Gestor) por cima do filtro de
  // Tipo de OS já existente. Loja é selecionada numa lista fechada (combinação exata por
  // id); Máquina funciona nos dois modos — texto livre comparado por substring, sem
  // diferenciar maiúsculas/minúsculas, e também pode ser escolhida a partir das sugestões
  // do datalist. O filtro de valor usa o custo TOTAL já lançado (Custo Hora Técnico +
  // Custo de Manutenção) — itens sem custo definido (solicitações e OS ainda em
  // andamento) só "combinam" quando nenhum filtro de valor está ativo.
  function combinaFiltrosAvancados(
    maquinaNome: string,
    lojaId: number,
    dataReferencia: string,
    valorTotal?: number,
  ): boolean {
    const combinaMaquina =
      !filtrosAvancados.maquina ||
      maquinaNome
        .toLowerCase()
        .includes(filtrosAvancados.maquina.trim().toLowerCase())
    const combinaLoja =
      !filtrosAvancados.loja || lojaId === Number(filtrosAvancados.loja)
    const combinaData = dataEstaNoIntervalo(
      dataReferencia,
      filtrosAvancados.dataInicio,
      filtrosAvancados.dataFim,
    )
    const combinaValor =
      !temFiltroDeValor ||
      (valorTotal !== undefined &&
        (valorMinimoFiltro === undefined || valorTotal >= valorMinimoFiltro) &&
        (valorMaximoFiltro === undefined || valorTotal <= valorMaximoFiltro))

    return combinaMaquina && combinaLoja && combinaData && combinaValor
  }

  // Fila do Gestor: Pendentes (esperando decisão) ou Rejeitadas (histórico do que ele
  // recusou, para consultar depois). 'Convertida' não aparece aqui — vira OS e o
  // acompanhamento passa para as abas de OS.
  const solicitacoesDaFila = solicitacoes.filter(
    (solicitacao) =>
      solicitacao.status === filtroStatus &&
      (!filtroTipo || solicitacao.tipo === filtroTipo) &&
      combinaFiltrosAvancados(
        obterNomeAlvo(solicitacao),
        solicitacao.lojaId,
        solicitacao.criadoEm,
      ),
  )

  // Contagem por status é do total no escopo, sem os filtros de tipo/avançados: o número
  // ao lado da aba precisa dizer quanto existe, não quanto sobrou do filtro atual.
  const contagensFila: Record<StatusFilaGestor, number> = {
    Pendente: solicitacoes.filter((item) => item.status === 'Pendente').length,
    Rejeitada: solicitacoes.filter((item) => item.status === 'Rejeitada')
      .length,
  }
  // Só é "OS Finalizada" para o Gestor quando ela passou por todas as etapas com
  // sucesso: Técnico encerrou (Concluída) e o Administrador já lançou o custo de
  // manutenção — ver regra de negócio no CLAUDE.md (item 11/12/13).
  const ordensFinalizadas = ordensServico.filter(
    (ordem) =>
      ordem.statusExecucao === 'Concluída' &&
      ordem.finalizada &&
      (!filtroTipo || ordem.tipo === filtroTipo) &&
      combinaFiltrosAvancados(
        obterNomeAlvo(ordem),
        ordem.lojaId,
        ordem.dataAbertura,
        (ordem.custo?.custoHoraTecnico ?? 0) +
          (ordem.custo?.custoManutencao ?? 0),
      ),
  )
  // Acompanhamento em tempo real do que o Técnico está fazendo (Aberta/Em Andamento/
  // Pausada) — o botão de pausa continua com o Técnico (ele é quem está na frente do
  // problema), mas o Gestor enxerga aqui o motivo de cada pausa para dar visibilidade
  // sem virar gargalo no fluxo. Ver regra de negócio no CLAUDE.md (item 9). Uma OS
  // encaminhada a terceiros continua aparecendo aqui: ela segue com o Técnico até ele
  // encerrar, só muda de tipo.
  const ordensEmExecucao = ordensServico.filter(
    (ordem) =>
      ordem.statusExecucao !== 'Concluída' &&
      (!filtroTipo || ordem.tipo === filtroTipo) &&
      combinaFiltrosAvancados(
        obterNomeAlvo(ordem),
        ordem.lojaId,
        ordem.dataAbertura,
      ),
  )

  const maquinasDisponiveis = [
    ...new Set(
      [...solicitacoes, ...ordensServico]
        .map((item) => item.maquinaNome)
        .filter((maquinaNome): maquinaNome is string => Boolean(maquinaNome)),
    ),
  ].sort((a, b) => a.localeCompare(b, 'pt-BR'))

  const quantidadeFiltrosAtivos =
    Object.values(filtrosAvancados).filter(Boolean).length

  return (
    <div className="flex min-h-svh flex-col bg-slate-50">
      <CabecalhoTopo />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-6 sm:px-8">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Painel do Gestor
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe as solicitações, OS e manutenções preventivas dos seus
            setores.
          </p>
        </div>

        <AcoesRapidas
          aoAbrirFiltros={() => setModalFiltrosAberto(true)}
          quantidadeFiltrosAtivos={quantidadeFiltrosAtivos}
        />

        <AbasPainelGestor
          abaSelecionada={abaSelecionada}
          aoSelecionarAba={aoSelecionarAba}
        />

        {abaSelecionada !== 'manutencao-preventiva' && (
          <div className="sm:w-56">
            <FiltroTipoOS valor={filtroTipo} aoMudar={setFiltroTipo} />
          </div>
        )}

        {abaSelecionada === 'solicitacoes' && (
          <FiltroStatusSolicitacao
            valor={filtroStatus}
            aoMudar={setFiltroStatus}
            contagens={contagensFila}
          />
        )}

        {escoposGestor.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200/60 bg-white py-12 text-slate-400">
            <Inbox size={28} className="text-slate-400" />
            <p className="text-sm">
              Nenhum setor/loja vinculado a este gestor.
            </p>
          </div>
        )}

        {abaSelecionada === 'solicitacoes' && (
          <NavegacaoLojaSetor
            itens={solicitacoesDaFila}
            carregando={carregandoSolicitacoes}
            mensagemVazio={
              filtroStatus === 'Pendente'
                ? 'Nenhuma solicitação pendente.'
                : 'Nenhuma solicitação rejeitada.'
            }
            rotuloNavegacao="Navegação das solicitações"
            rotuloQuantidade={(n) =>
              n === 1 ? '1 solicitação' : `${n} solicitações`
            }
            ehDestaque={(solicitacao) =>
              solicitacao.impactos.includes('Afeta Produção')
            }
            rotuloDestaques={rotuloAfetaProducao}
            renderItem={(solicitacao) => (
              <CardSolicitacaoGestor
                solicitacao={solicitacao}
                // Rejeitada é histórico: sobra só o botão de visualizar.
                aoAbrirOS={
                  filtroStatus === 'Pendente'
                    ? setSolicitacaoParaAbrirOS
                    : undefined
                }
                aoRejeitar={
                  filtroStatus === 'Pendente'
                    ? setSolicitacaoParaRejeitar
                    : undefined
                }
                aoVisualizar={setSolicitacaoParaVisualizar}
              />
            )}
          />
        )}

        {abaSelecionada === 'os-em-andamento' && (
          <NavegacaoLojaSetor
            itens={ordensEmExecucao}
            carregando={carregandoOrdensServico}
            mensagemVazio="Nenhuma OS em aberto, em andamento ou pausada no momento."
            rotuloNavegacao="Navegação das OS em andamento"
            rotuloQuantidade={rotuloOS}
            ehDestaque={(ordemServico) => ordemServico.afetaProducao}
            rotuloDestaques={rotuloAfetaProducao}
            renderItem={(ordemServico) => (
              <CardOSEmExecucao ordemServico={ordemServico} />
            )}
          />
        )}

        {abaSelecionada === 'os-finalizadas' && (
          <NavegacaoLojaSetor
            itens={ordensFinalizadas}
            carregando={carregandoOrdensServico}
            mensagemVazio="Nenhuma OS finalizada ainda — a OS só aparece aqui depois que o Técnico encerra o atendimento e o Administrador lança o custo de manutenção."
            rotuloNavegacao="Navegação das OS finalizadas"
            rotuloQuantidade={rotuloOS}
            tamanhoPagina={TAMANHO_PAGINA_FINALIZADAS}
            renderItem={(ordemServico) => (
              <CardOSFinalizada
                ordemServico={ordemServico}
                aoVisualizar={(ordem) =>
                  setSelecaoOS({ ordem, imprimir: false })
                }
                aoImprimir={(ordem) => setSelecaoOS({ ordem, imprimir: true })}
              />
            )}
          />
        )}

        {abaSelecionada === 'manutencao-preventiva' && (
          <SeletorPreventivas
            preventivas={preventivas}
            lojas={lojas}
            carregando={carregandoPreventivas}
          />
        )}
      </main>

      <footer className="py-4 text-center">
        <span className="font-mono text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
          Solicitação OS © {new Date().getFullYear()}
        </span>
      </footer>

      {solicitacaoParaAbrirOS && (
        <ModalAbrirOrdemServico
          solicitacao={solicitacaoParaAbrirOS}
          aoFechar={() => setSolicitacaoParaAbrirOS(null)}
          aoSalvar={aoConfirmarAberturaOS}
        />
      )}

      {solicitacaoParaRejeitar && (
        <ModalRejeitarSolicitacao
          solicitacao={solicitacaoParaRejeitar}
          aoFechar={() => setSolicitacaoParaRejeitar(null)}
          aoSalvar={aoConfirmarRejeicao}
        />
      )}

      {solicitacaoParaVisualizar && (
        <ModalDetalhesSolicitacao
          solicitacao={solicitacaoParaVisualizar}
          contexto="Painel do Gestor"
          aoFechar={() => setSolicitacaoParaVisualizar(null)}
        />
      )}

      {selecaoOS && (
        <ModalDetalhesOS
          ordemServico={selecaoOS.ordem}
          autoImprimir={selecaoOS.imprimir}
          contexto="Painel do Gestor"
          aoFechar={() => setSelecaoOS(null)}
        />
      )}

      {modalFiltrosAberto && (
        <ModalFiltrosOS
          lojas={lojas}
          maquinas={maquinasDisponiveis}
          filtros={filtrosAvancados}
          aoFechar={() => setModalFiltrosAberto(false)}
          aoAplicar={(novosFiltros) => {
            setFiltrosAvancados(novosFiltros)
            setModalFiltrosAberto(false)
          }}
        />
      )}
    </div>
  )
}
