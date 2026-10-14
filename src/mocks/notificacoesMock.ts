// Central de notificações do modo mock: a coleção em memória e os mesmos eventos do
// servidor (NotificacaoService no back) -- quem recebe, texto e url iguais aos de lá.
// Sem isto o sininho funcionaria só contra a API real, e a demonstração mostraria um
// painel sempre vazio. Ver "Notificações" em ../../sistema-OSm--Back-end/docs/fluxo-de-negocio.md.
import type { OrdemServico, SolicitacaoOS } from '../tipos/ordemServico'
import type { Notificacao, TipoNotificacao } from '../tipos/notificacao'
import { agoraParaBackend } from '../utilitarios/dataBackend'
import { ordensServico, solicitacoes, usuarios } from './bancoMock'
import { construirEscoposGestor, gestorTemAcesso } from './regrasMock'
import { gerarId } from './utilidadesMock'

// Uma linha por destinatário, como a tabela `notificacao`.
export interface NotificacaoInterna extends Notificacao {
  usuarioId: number
}

export const notificacoes: NotificacaoInterna[] = []

interface NovaNotificacao {
  tipo: TipoNotificacao
  titulo: string
  corpo: string
  url: string
}

function entregar(
  usuariosIds: number[],
  nova: NovaNotificacao,
  criadoEm = agoraParaBackend(),
) {
  for (const usuarioId of usuariosIds) {
    notificacoes.push({
      ...nova,
      id: gerarId(notificacoes),
      usuarioId,
      lida: false,
      lidaEm: null,
      criadoEm,
    })
  }
}

// ObterGestoresDoSetor: todo gestor ativo cujo escopo alcança o setor.
function gestoresDoSetor(lojaId: number, setorId: number): number[] {
  return usuarios
    .filter(
      (usuario) =>
        usuario.perfil === 'gestor' &&
        usuario.ativo &&
        gestorTemAcesso(construirEscoposGestor(usuario), lojaId, setorId),
    )
    .map((usuario) => usuario.id)
}

// alvoDaSolicitacao/alvoDaOS do back: "Forno · PAT-001" ou o item do reparo.
function alvo(
  item: Pick<SolicitacaoOS, 'maquinaNome' | 'maquinaCodigo' | 'itemDescricao'>,
) {
  if (item.maquinaNome) {
    return item.maquinaCodigo
      ? `${item.maquinaNome} · ${item.maquinaCodigo}`
      : item.maquinaNome
  }
  return item.itemDescricao ?? 'item não identificado'
}

// `tecnicoId` é opcional no tipo do front; OS sem técnico não tem a quem avisar.
function tecnicoDa(ordem: OrdemServico): number[] {
  return ordem.tecnicoId ? [ordem.tecnicoId] : []
}

function local(item: Pick<SolicitacaoOS, 'lojaNome' | 'setorNome'>) {
  return `${item.lojaNome} / ${item.setorNome}`
}

export function notificarNovaSolicitacao(
  solicitacao: SolicitacaoOS,
  criadoEm?: string,
) {
  const quem = solicitacao.solicitanteNome
    ? ` — ${solicitacao.solicitanteNome}:`
    : ' —'
  entregar(
    gestoresDoSetor(solicitacao.lojaId, solicitacao.setorId),
    {
      tipo: 'solicitacao_nova',
      titulo: `Nova solicitação · ${local(solicitacao)}`,
      corpo: `${alvo(solicitacao)}${quem} "${solicitacao.descricao}"`,
      url: `/painel-gestor?solicitacao=${solicitacao.id}`,
    },
    criadoEm,
  )
}

// Técnico primeiro, depois o Solicitante (só quando a OS veio de um pedido de verdade --
// a direta passa null: quem "pediu" é o próprio Gestor).
export function notificarAbertura(
  ordem: OrdemServico,
  solicitanteId: number | null,
  criadoEm?: string,
) {
  const urgencia = ordem.urgencia ? ` · Urgência ${ordem.urgencia}` : ''
  entregar(
    tecnicoDa(ordem),
    {
      tipo: 'os_aberta',
      titulo: `Nova OS pra você · ${local(ordem)}`,
      corpo: `${alvo(ordem)} — "${ordem.descricao}"${urgencia}`,
      url: `/painel-tecnico?os=${ordem.id}`,
    },
    criadoEm,
  )

  if (solicitanteId !== null) {
    const com = ordem.tecnicoNome ? ` com ${ordem.tecnicoNome}` : ''
    entregar(
      [solicitanteId],
      {
        tipo: 'solicitacao_aceita',
        titulo: `Solicitação aceita · ${local(ordem)}`,
        corpo: `${alvo(ordem)} — virou OS${com}.`,
        url: `/minhas-solicitacoes?solicitacao=${ordem.solicitacaoId}`,
      },
      criadoEm,
    )
  }
}

export function notificarRejeicao(solicitacao: SolicitacaoOS) {
  if (
    solicitacao.origem !== 'solicitante' ||
    solicitacao.solicitanteId === null
  ) {
    return
  }
  entregar([solicitacao.solicitanteId], {
    tipo: 'solicitacao_rejeitada',
    titulo: `Solicitação rejeitada · ${local(solicitacao)}`,
    corpo: `${alvo(solicitacao)} — motivo: "${solicitacao.motivoRejeicao ?? ''}"`,
    url: `/minhas-solicitacoes?solicitacao=${solicitacao.id}`,
  })
}

export function notificarOSPreventiva(ordem: OrdemServico, criadoEm?: string) {
  entregar(
    tecnicoDa(ordem),
    {
      tipo: 'os_preventiva',
      titulo: `Preventiva agendada · ${local(ordem)}`,
      corpo: `${alvo(ordem)} — "${ordem.descricao}". A OS já está no seu painel.`,
      url: `/painel-tecnico?os=${ordem.id}`,
    },
    criadoEm,
  )
}

export function notificarConclusao(ordem: OrdemServico) {
  const por = ordem.tecnicoNome ? ` por ${ordem.tecnicoNome}` : ''
  entregar(gestoresDoSetor(ordem.lojaId, ordem.setorId), {
    tipo: 'os_concluida',
    titulo: `OS concluída · ${local(ordem)}`,
    corpo: `${alvo(ordem)} — encerrada${por}.`,
    url: `/painel-gestor?os=${ordem.id}`,
  })
}

// Seed: as notificações que o seed de solicitações/OS já teria gerado, com a data de
// cada item -- assim o sininho de cada perfil de demonstração não começa vazio.
//
// ⚠️ Chamado por rotas/notificacoes.ts, nunca no topo deste módulo: regrasMock importa
// este arquivo (a preventiva vencida notifica) e este importa regrasMock -- o ciclo é
// inofensivo enquanto ninguém CHAMA nada durante o carregamento dos dois.
let semeado = false

export function semearNotificacoes() {
  if (semeado) {
    return
  }
  semeado = true

  for (const solicitacao of solicitacoes) {
    if (
      solicitacao.origem === 'solicitante' &&
      solicitacao.status === 'Pendente'
    ) {
      notificarNovaSolicitacao(solicitacao, solicitacao.criadoEm)
    }
  }
  for (const ordem of ordensServico) {
    if (ordem.statusExecucao !== 'Aberta') {
      continue
    }
    const origem = solicitacoes.find((item) => item.id === ordem.solicitacaoId)
    if (origem?.origem === 'preventiva') {
      notificarOSPreventiva(ordem, ordem.dataAbertura)
      continue
    }
    const solicitanteId =
      origem?.origem === 'solicitante' ? origem.solicitanteId : null
    notificarAbertura(ordem, solicitanteId, ordem.dataAbertura)
  }
}
