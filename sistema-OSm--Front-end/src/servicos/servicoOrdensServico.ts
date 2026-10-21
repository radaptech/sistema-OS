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
import type { EventoOrdemServico } from '../tipos/eventoOrdemServico'
import type { RespostaPaginada } from '../tipos/paginacao'

export interface ParametrosListagemOrdensServico {
  status?: StatusExecucaoOS[]
  finalizada?: boolean
  tipo?: TipoOS
  lojaId?: number
  // Recorta pelo setor da solicitação de origem (a OS não tem setor próprio). Como todo
  // filtro do cliente, só estreita: setor fora do escopo do usuário devolve lista vazia.
  setorId?: number
  // Nível de máquina das OS Finalizadas do Gestor: a máquina da solicitação, ou
  // `reparo: true` para os pequenos reparos do setor (que não têm máquina).
  maquinaId?: number
  reparo?: boolean
  tecnicoId?: number
  busca?: string
  // Abas de Custos Pendentes: o Administrador já conferiu o custo (custo.revisadoEm).
  revisado?: boolean
  // Filtros avançados do Painel do Gestor (ModalFiltrosOS), aplicados no servidor porque a
  // lista de OS Finalizadas é paginada e a tela não tem a lista inteira para filtrar.
  // `maquina` casa nome OU patrimônio; as datas (AAAA-MM-DD) são o dia de abertura; os
  // valores são o custo TOTAL já lançado.
  maquina?: string
  dataInicio?: string
  dataFim?: string
  valorMinimo?: number
  valorMaximo?: number
}

// Uma linha de GET /ordens-servico/resumo: quantas OS há numa máquina de um setor (e a loja
// dele) para os filtros pedidos. É o que monta os cards de loja, setor e máquina quando a
// lista é paginada no servidor — a soma das linhas é o `total` da listagem com os mesmos
// filtros. Os pequenos reparos do setor vêm numa linha só, com `maquina*` nulos.
export interface ResumoOrdensServicoSetor {
  lojaId: number
  lojaNome: string
  setorId: number
  setorNome: string
  maquinaId: number | null
  maquinaNome: string | null
  maquinaCodigo: string | null
  quantidade: number
  afetamProducao: number
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

  // Uma OS no escopo de quem pede (404 fora dele). É o que o link de notificação usa em vez
  // de baixar a lista inteira só para achar uma.
  obterPorId: (id: number) => api.get<OrdemServico>(`/ordens-servico/${id}`),

  // Contagem por loja/setor/máquina para os mesmos filtros de `listar`.
  resumoPorSetor: (parametros: ParametrosListagemOrdensServico = {}) =>
    api.get<ResumoOrdensServicoSetor[]>(`/ordens-servico/resumo${montarQuery(parametros)}`),

  // Linha do tempo da OS: quem fez cada passo e quando, do mais antigo ao mais novo. Gestor
  // (dentro do escopo), Administrador e o Técnico dono; OS fora do alcance é 404.
  listarHistorico: (id: number) =>
    api.get<EventoOrdemServico[]>(`/ordens-servico/${id}/historico`),

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
