import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ClipboardCheck,
  Inbox,
  PauseCircle,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'react-toastify'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CabecalhoTopo } from '../../componentes/CabecalhoTopo'
import { NavegacaoLojaSetor } from '../../componentes/NavegacaoLojaSetor'
import { NavegacaoLojaSetorPaginada } from '../../componentes/NavegacaoLojaSetorPaginada'
import { useEstadoAutenticacao } from '../../estado/estadoAutenticacao'
import { useIdDaUrl } from '../../hooks/useIdDaUrl'
import { useOrdensServicoTecnico } from '../../hooks/useOrdensServicoTecnico'
import { servicoSolicitacoes } from '../../servicos/servicoSolicitacoes'
import { servicoOrdensServico } from '../../servicos/servicoOrdensServico'
import type { OrdemServico, SolicitacaoOS } from '../../tipos/ordemServico'
import { ordenarPorPrioridade } from '../../utilitarios/ordenarPrioridadeOS'
import { ModalDetalhesSolicitacao } from '../ModalDetalhesSolicitacao/ModalDetalhesSolicitacao'
import { ModalEncerrarOrdemServico } from '../ModalEncerrarOrdemServico/ModalEncerrarOrdemServico'
import type { EncerramentoOrdemServicoPayload } from '../../tipos/ordemServico'
import { ABAS_PAINEL_TECNICO, type AbaPainelTecnico } from './abasPainelTecnico'
import { AbasPainelTecnico } from './componentes/AbasPainelTecnico'
import { CardOrdemServicoTecnico } from './componentes/CardOrdemServicoTecnico'
import { ModalDetalhesEncerramento } from './componentes/ModalDetalhesEncerramento'
import { ModalPausarOrdemServico } from './componentes/ModalPausarOrdemServico'
import { ModalAcionarTerceiro } from './componentes/ModalAcionarTerceiro'
import type { DadosPausarOrdemServico } from './esquemaPausarOrdemServico'
import type { DadosAcionarTerceiro } from './esquemaAcionarTerceiro'

const CHAVE_ORDENS_SERVICO_TECNICO = 'ordens-servico-tecnico'
const TAMANHO_PAGINA = 12

// Concluídas não vêm na lista do painel: são paginadas no servidor, só da aba delas.
type AbaEmAndamento = Exclude<AbaPainelTecnico, 'concluidas'>

// Em que aba a OS aparece -- mesmo critério de `ordensPorAba` abaixo. Concluída sem
// custo lançado não aparece em aba nenhuma (ver o comentário de `concluidas`); fica na
// primeira, e o modal abre do mesmo jeito.
function abaDaOrdem(ordem: OrdemServico): AbaPainelTecnico {
  if (ordem.finalizada) {
    return 'concluidas'
  }
  return ordem.statusExecucao === 'Pausada' ? 'pendentes-pausadas' : 'em-aberto'
}

export function PainelTecnico() {
  const tecnicoId = useEstadoAutenticacao((estado) => estado.tecnicoId)
  const queryClient = useQueryClient()
  // A aba mora na URL (?aba=) junto com os níveis de loja/setor (NavegacaoLojaSetor): o
  // F5 e o voltar do navegador reabrem onde o Técnico estava, e trocar de aba começa do
  // topo dela — uma aba não herda a loja/setor da outra.
  const [parametros, setParametros] = useSearchParams()
  const abaDaUrl = parametros.get('aba')
  const abaSelecionada: AbaPainelTecnico =
    ABAS_PAINEL_TECNICO.find((aba) => aba === abaDaUrl) ?? 'em-aberto'

  function aoSelecionarAba(aba: AbaPainelTecnico) {
    setParametros({ aba })
  }
  const [ordemParaPausar, setOrdemParaPausar] = useState<OrdemServico | null>(
    null,
  )
  const [ordemParaEncerrar, setOrdemParaEncerrar] =
    useState<OrdemServico | null>(null)
  const [ordemParaAcionarTerceiro, setOrdemParaAcionarTerceiro] =
    useState<OrdemServico | null>(null)
  const [ordemParaVerDetalhes, setOrdemParaVerDetalhes] =
    useState<OrdemServico | null>(null)
  const [solicitacaoParaVisualizar, setSolicitacaoParaVisualizar] =
    useState<SolicitacaoOS | null>(null)

  const { data: ordensServico = [], isLoading } = useOrdensServicoTecnico(tecnicoId)

  // Link de notificação (sininho/push): ?os=N -- a OS nova no nome dele. Busca a OS por id
  // (a lista do cache pode ser de antes dela nascer, e a concluída nem está nela), vai pra
  // aba onde ela está e abre o detalhe da solicitação: é ali que estão a descrição e as
  // fotos do problema.
  const [osDaUrl] = useIdDaUrl('os')

  useEffect(() => {
    if (osDaUrl === null) {
      return
    }
    servicoOrdensServico
      .obterPorId(osDaUrl)
      .then((ordem) => {
        // Trocar a aba já tira o ?os= da URL (setParametros substitui a query inteira).
        setParametros({ aba: abaDaOrdem(ordem) }, { replace: true })
        return aoVerSolicitacao(ordem)
      })
      .catch(() => {
        // Fora do escopo ou inexistente: o api.ts já mostra o toast do 404.
        setParametros({ aba: abaSelecionada }, { replace: true })
      })
    // Só reage ao id da URL: as funções acima mudam a cada render e reabririam o modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [osDaUrl])

  // As duas: a lista do que está em andamento, e a paginada/resumo das concluídas. Encerrar
  // lança o custo na hora, então a OS sai de uma e entra na outra no mesmo passo.
  function invalidarOrdensServico() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: [CHAVE_ORDENS_SERVICO_TECNICO] }),
      queryClient.invalidateQueries({ queryKey: ['ordens-servico-todas'] }),
    ])
  }

  const { mutateAsync: iniciar } = useMutation({
    mutationFn: (id: number) => servicoOrdensServico.iniciar(id),
    onSuccess: invalidarOrdensServico,
  })

  const { mutateAsync: pausar } = useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) =>
      servicoOrdensServico.pausar(id, motivo),
    onSuccess: invalidarOrdensServico,
  })

  const { mutateAsync: retomar } = useMutation({
    mutationFn: (id: number) => servicoOrdensServico.retomar(id),
    onSuccess: invalidarOrdensServico,
  })

  const { mutateAsync: encerrar } = useMutation({
    mutationFn: servicoOrdensServico.encerrar,
    onSuccess: invalidarOrdensServico,
  })

  const { mutateAsync: acionarTerceiro } = useMutation({
    mutationFn: servicoOrdensServico.acionarTerceiro,
    onSuccess: invalidarOrdensServico,
  })

  async function aoIniciar(ordemServico: OrdemServico) {
    await iniciar(ordemServico.id)
    toast.success(`OS #${ordemServico.id} iniciada.`)
  }

  async function aoConfirmarPausa(dados: DadosPausarOrdemServico) {
    if (!ordemParaPausar) {
      return
    }

    await pausar({ id: ordemParaPausar.id, motivo: dados.motivo })
    toast.success(`OS #${ordemParaPausar.id} pausada.`)
  }

  async function aoRetomar(ordemServico: OrdemServico) {
    await retomar(ordemServico.id)
    toast.success(`OS #${ordemServico.id} retomada.`)
  }

  async function aoConfirmarAcionamentoTerceiro(dados: DadosAcionarTerceiro) {
    if (!ordemParaAcionarTerceiro) {
      return
    }

    await acionarTerceiro({
      ordemServicoId: ordemParaAcionarTerceiro.id,
      ...dados,
    })
    toast.success(
      `OS #${ordemParaAcionarTerceiro.id} encaminhada para empresa terceirizada.`,
    )
  }

  async function aoVerSolicitacao(ordemServico: OrdemServico) {
    const solicitacao = await servicoSolicitacoes.obterPorId(
      ordemServico.solicitacaoId,
    )
    setSolicitacaoParaVisualizar(solicitacao)
  }

  async function aoConfirmarEncerramento(
    dados: Omit<EncerramentoOrdemServicoPayload, 'ordemServicoId'>,
  ) {
    if (!ordemParaEncerrar) {
      return
    }

    await encerrar({ ordemServicoId: ordemParaEncerrar.id, ...dados })
    toast.success(`OS #${ordemParaEncerrar.id} encerrada com sucesso.`)
  }

  const ordensPorAba: Record<AbaEmAndamento, OrdemServico[]> = {
    'em-aberto': ordensServico.filter(
      (ordem) =>
        ordem.statusExecucao === 'Aberta' ||
        ordem.statusExecucao === 'Em Andamento',
    ),
    'pendentes-pausadas': ordensServico.filter(
      (ordem) => ordem.statusExecucao === 'Pausada',
    ),
  }

  const ESTADO_VAZIO: Record<
    AbaPainelTecnico,
    { Icone: LucideIcon; mensagem: string }
  > = {
    'em-aberto': { Icone: Inbox, mensagem: 'Nenhuma OS em aberto no momento.' },
    'pendentes-pausadas': {
      Icone: PauseCircle,
      mensagem: 'Nenhuma OS pendente ou pausada.',
    },
    concluidas: {
      Icone: ClipboardCheck,
      mensagem:
        'Nenhuma OS concluída ainda — a OS só aparece aqui depois que o Administrador lança o custo de manutenção.',
    },
  }

  // Máquina Parada primeiro, depois Urgência, depois a OS mais antiga — ver
  // ordenarPrioridadeOS.ts. Ordena antes de navegar para a lista de cada setor já sair
  // com os cards na prioridade certa (e a página 1 ser a mais urgente).
  const ordensExibidas = ordenarPorPrioridade(
    abaSelecionada === 'concluidas' ? [] : ordensPorAba[abaSelecionada],
  )
  const { Icone: IconeVazio, mensagem: mensagemVazia } =
    ESTADO_VAZIO[abaSelecionada]

  function renderizarCard(ordemServico: OrdemServico) {
    return (
      <CardOrdemServicoTecnico
        ordemServico={ordemServico}
        aoIniciar={
          ordemServico.statusExecucao === 'Aberta' ? aoIniciar : undefined
        }
        aoPausar={
          ordemServico.statusExecucao === 'Aberta' ||
          ordemServico.statusExecucao === 'Em Andamento'
            ? setOrdemParaPausar
            : undefined
        }
        aoRetomar={
          ordemServico.statusExecucao === 'Pausada' ? aoRetomar : undefined
        }
        aoFinalizar={
          ordemServico.statusExecucao === 'Em Andamento'
            ? setOrdemParaEncerrar
            : undefined
        }
        aoVerDetalhes={
          ordemServico.statusExecucao === 'Concluída'
            ? setOrdemParaVerDetalhes
            : undefined
        }
        // Acionar terceiro é decisão de quem está com a OS na mão, e vale enquanto ela
        // não estiver encerrada — inclusive Pausada, que é onde ela costuma ficar
        // esperando a empresa aparecer.
        aoAcionarTerceiro={
          ordemServico.statusExecucao !== 'Concluída'
            ? setOrdemParaAcionarTerceiro
            : undefined
        }
        aoVerSolicitacao={aoVerSolicitacao}
      />
    )
  }

  return (
    <div className="flex min-h-svh flex-col bg-slate-50">
      <CabecalhoTopo />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-6 sm:px-8">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Painel do Técnico
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe as ordens de serviço em que você é o técnico responsável.
          </p>
        </div>

        <AbasPainelTecnico
          abaSelecionada={abaSelecionada}
          aoSelecionarAba={aoSelecionarAba}
        />

        {abaSelecionada === 'concluidas' ? (
          // Histórico que só cresce: paginado no servidor (resumo + uma página por vez). Só
          // aparece aqui depois que o custo foi lançado — a mesma regra de "OS Finalizada" do
          // Gestor e do Administrador (item 9/13). Concluída sem custo fica invisível até lá.
          // Sem selo de máquina parada: a OS já foi encerrada e o selo enganaria. Desce até a
          // máquina, como as OS Finalizadas do Gestor: o histórico do setor junta muitas.
          <NavegacaoLojaSetorPaginada
            filtros={{ tecnicoId: tecnicoId ?? undefined, finalizada: true }}
            mensagemVazio={mensagemVazia}
            IconeVazio={IconeVazio}
            rotuloNavegacao="Navegação das ordens de serviço"
            porMaquina
            renderItem={renderizarCard}
          />
        ) : (
          <NavegacaoLojaSetor
            itens={ordensExibidas}
            carregando={isLoading}
            mensagemVazio={mensagemVazia}
            IconeVazio={IconeVazio}
            rotuloNavegacao="Navegação das ordens de serviço"
            rotuloQuantidade={(n) => (n === 1 ? '1 OS' : `${n} OS`)}
            // Mesmo critério do BadgeAfetaProducao do card: máquina parada é o que o
            // Técnico ataca primeiro, e o selo mostra em que loja/setor ela está.
            ehDestaque={(ordemServico) => ordemServico.afetaProducao}
            rotuloDestaques={(n) =>
              n === 1 ? '1 máquina parada' : `${n} máquinas paradas`
            }
            tamanhoPagina={TAMANHO_PAGINA}
            renderItem={renderizarCard}
          />
        )}
      </main>

      <footer className="py-4 text-center">
        <span className="font-mono text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
          Solicitação OS © {new Date().getFullYear()}
        </span>
      </footer>

      {ordemParaPausar && (
        <ModalPausarOrdemServico
          ordemServico={ordemParaPausar}
          aoFechar={() => setOrdemParaPausar(null)}
          aoSalvar={aoConfirmarPausa}
        />
      )}

      {ordemParaAcionarTerceiro && (
        <ModalAcionarTerceiro
          ordemServico={ordemParaAcionarTerceiro}
          aoFechar={() => setOrdemParaAcionarTerceiro(null)}
          aoSalvar={aoConfirmarAcionamentoTerceiro}
        />
      )}

      {ordemParaEncerrar && (
        <ModalEncerrarOrdemServico
          ordemServico={ordemParaEncerrar}
          aoFechar={() => setOrdemParaEncerrar(null)}
          aoSalvar={aoConfirmarEncerramento}
        />
      )}

      {ordemParaVerDetalhes && (
        <ModalDetalhesEncerramento
          ordemServico={ordemParaVerDetalhes}
          aoFechar={() => setOrdemParaVerDetalhes(null)}
        />
      )}

      {solicitacaoParaVisualizar && (
        <ModalDetalhesSolicitacao
          solicitacao={solicitacaoParaVisualizar}
          contexto="Painel do Técnico"
          aoFechar={() => setSolicitacaoParaVisualizar(null)}
        />
      )}
    </div>
  )
}
