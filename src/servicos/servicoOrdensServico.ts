import { api } from './api'
import { montarQuery } from './montarQuery'
import type {
  AcionamentoTerceiroPayload,
  EncerramentoOrdemServicoPayload,
  LancamentoCustoManutencaoPayload,
  OrdemServico,
  StatusExecucaoOS,
  TipoOS,
} from '../tipos/ordemServico'
import type { RespostaPaginada } from '../tipos/paginacao'

export interface ParametrosListagemOrdensServico {
  status?: StatusExecucaoOS[]
  finalizada?: boolean
  tipo?: TipoOS
  lojaId?: number
  // Recorta pelo setor da solicitação de origem (a OS não tem setor próprio). Como todo
  // filtro do cliente, só estreita: setor fora do escopo do usuário devolve lista vazia.
  setorId?: number
  tecnicoId?: number
  busca?: string
  // Abas de Custos Pendentes: o Administrador já conferiu o custo (custo.revisadoEm).
  revisado?: boolean
}

// Com `pagina`, GET /ordens-servico devolve RespostaPaginada (12 por página). Sem ela,
// o array inteiro — que é o que os painéis do Gestor e do Técnico usam para montar a
// navegação Loja → Setor e as contagens.
export interface ParametrosListagemPaginadaOS extends ParametrosListagemOrdensServico {
  pagina: number
}

// Um endpoint serve os três painéis; o que muda é o filtro. O escopo (OS do técnico
// autenticado, lojas/setores do gestor) é sempre aplicado no servidor.
export const servicoOrdensServico = {
  listar: (parametros: ParametrosListagemOrdensServico = {}) =>
    api.get<OrdemServico[]>(`/ordens-servico${montarQuery(parametros)}`),

  // Histórico que só cresce (OS Finalizadas, Custos Pendentes): uma página por vez.
  listarPaginada: (parametros: ParametrosListagemPaginadaOS) =>
    api.get<RespostaPaginada<OrdemServico>>(`/ordens-servico${montarQuery(parametros)}`),

  obterPorId: (id: number) => api.get<OrdemServico>(`/ordens-servico/${id}`),

  iniciar: (id: number) =>
    api.post<OrdemServico>(`/ordens-servico/${id}/iniciar`),

  pausar: (id: number, motivo: string) =>
    api.post<OrdemServico>(`/ordens-servico/${id}/pausar`, { motivo }),

  retomar: (id: number) =>
    api.post<OrdemServico>(`/ordens-servico/${id}/retomar`),

  // Encaminha a OS para uma empresa externa sem tirá-la do Técnico: muda o tipo para
  // 'terceiros' e grava a empresa. O ciclo de vida (iniciar/pausar/retomar/encerrar) segue
  // igual — ver AcionamentoTerceiroPayload.
  acionarTerceiro: ({ ordemServicoId, ...dados }: AcionamentoTerceiroPayload) =>
    api.post<OrdemServico>(
      `/ordens-servico/${ordemServicoId}/acionar-terceiro`,
      dados,
    ),

  encerrar: ({ ordemServicoId, ...dados }: EncerramentoOrdemServicoPayload) =>
    api.post<OrdemServico>(`/ordens-servico/${ordemServicoId}/encerrar`, dados),

  lancarCustoManutencao: ({
    ordemServicoId,
    ...dados
  }: LancamentoCustoManutencaoPayload) =>
    api.post<OrdemServico>(`/ordens-servico/${ordemServicoId}/custo`, dados),

  obterPdfImpressao: (id: number) =>
    api.get<Blob>(`/ordens-servico/${id}/impressao`),
}
