import { api } from './api'
import { montarMultipart } from './montarMultipart'
import { montarQuery } from './montarQuery'
import { servicoReparos } from './servicoReparos'
import type { NovaSolicitacaoReparoPayload } from '../tipos/reparo'
import type {
  AberturaOrdemServicoPayload,
  RejeicaoSolicitacaoPayload,
  NovaSolicitacaoDiretaPayload,
  NovaSolicitacaoOSPayload,
  OrdemServico,
  ResumoSolicitacoes,
  SolicitacaoOS,
  StatusSolicitacao,
  TipoOS,
} from '../tipos/ordemServico'
import type { RespostaPaginada } from '../tipos/paginacao'
import type { MaquinaDasMinhasSolicitacoes } from '../tipos/maquina'

export interface ParametrosListagemSolicitacoes {
  pagina: number
  status?: StatusSolicitacao
  busca?: string
  // Só as solicitações desta máquina (pequeno reparo, sem máquina, nunca casa).
  maquinaId?: number
}

export interface ParametrosFilaGestor {
  status?: StatusSolicitacao
  tipo?: TipoOS
  lojaId?: number
  busca?: string
  pagina?: number
}

// Os dois tipos abríveis compartilham uma única tela (NovaSolicitacao) mas continuam em
// endpoints distintos — o tipo discrimina qual deles recebe o multipart. 'terceiros' não
// entra aqui: não se abre uma solicitação terceirizada, o Técnico é que encaminha depois.
export type EnvioNovaSolicitacao =
  | ({ tipo: 'maquinario' } & NovaSolicitacaoOSPayload)
  | ({ tipo: 'reparo' } & NovaSolicitacaoReparoPayload)

function criarMaquinario(
  dados: NovaSolicitacaoOSPayload,
  fotoDefeito: File,
  videoDefeito?: File,
) {
  return api.post<SolicitacaoOS>(
    '/solicitacoes/maquinario',
    montarMultipart(dados, { foto: fotoDefeito, video: videoDefeito }),
  )
}

export const servicoSolicitacoes = {
  criar: criarMaquinario,

  // Despacha para o endpoint do tipo escolhido. A foto é obrigatória nos dois: é a
  // evidência que o Gestor usa para avaliar antes de aprovar. Vídeo só existe em OS de
  // máquina (Maquinário).
  criarPorTipo: (envio: EnvioNovaSolicitacao, foto: File, video?: File) => {
    if (envio.tipo === 'reparo') {
      return servicoReparos.criar(
        { item: envio.item, descricao: envio.descricao },
        foto,
      )
    }

    return criarMaquinario(
      {
        maquinaId: envio.maquinaId,
        descricao: envio.descricao,
        impactos: envio.impactos,
      },
      foto,
      video,
    )
  },

  // Minhas Solicitações — o servidor restringe ao solicitante autenticado.
  listar: (parametros: ParametrosListagemSolicitacoes) =>
    api.get<RespostaPaginada<SolicitacaoOS>>(
      `/solicitacoes/minhas${montarQuery(parametros)}`,
    ),

  // Opções do filtro "de qual máquina": as máquinas das MINHAS solicitações, não as do
  // setor — máquina desativada ou de um setor antigo continua no histórico.
  listarMinhasMaquinas: () =>
    api.get<MaquinaDasMinhasSolicitacoes[]>('/solicitacoes/minhas/maquinas'),

  // Fila do Gestor — já filtrada pelo escopo de Loja/Setor no servidor.
  listarTodas: (parametros: ParametrosFilaGestor = {}) =>
    api.get<SolicitacaoOS[]>(`/solicitacoes${montarQuery(parametros)}`),

  obterPorId: (id: number) => api.get<SolicitacaoOS>(`/solicitacoes/${id}`),

  // Contadores da Home do Solicitante.
  obterResumo: () => api.get<ResumoSolicitacoes>('/solicitacoes/resumo'),

  // Atribui Técnico e Urgência, criando a OS — vale para os dois tipos, já que toda OS
  // passa pelo Técnico. O instante da abertura é fato do servidor.
  abrirOS: ({ solicitacaoId, ...dados }: AberturaOrdemServicoPayload) =>
    api.post<OrdemServico>(`/solicitacoes/${solicitacaoId}/abrir-os`, dados),

  // Gestor/Administrador abre a OS direto, sem fila e sem foto (quando o Solicitante não
  // está disponível). Responde a OS criada, como abrirOS.
  criarDireta: (dados: NovaSolicitacaoDiretaPayload) =>
    api.post<OrdemServico>('/solicitacoes/direta', dados),

  // Encerra a solicitação sem abrir OS. O motivo é obrigatório e volta para o Solicitante.
  rejeitar: ({ solicitacaoId, ...dados }: RejeicaoSolicitacaoPayload) =>
    api.post<SolicitacaoOS>(`/solicitacoes/${solicitacaoId}/rejeitar`, dados),
}
