import { api } from './api'
import { montarQuery } from './montarQuery'
import type {
  CicloPreventiva,
  PreventivaListada,
  PreventivaManutencao,
} from '../tipos/maquina'

export interface ParametrosListagemPreventivas {
  maquinaId?: number
}

export const servicoPreventivas = {
  listar: (parametros: ParametrosListagemPreventivas = {}) =>
    api.get<PreventivaListada[]>(`/preventivas${montarQuery(parametros)}`),

  // Os ciclos (OS) que a preventiva já gerou, mais recente primeiro. 404 fora do escopo.
  historico: (id: number) =>
    api.get<CicloPreventiva[]>(`/preventivas/${id}/historico`),

  criar: (dados: PreventivaManutencao) =>
    api.post<PreventivaListada>('/preventivas', dados),

  atualizar: (id: number, dados: PreventivaManutencao) =>
    api.put<PreventivaListada>(`/preventivas/${id}`, dados),

  deletar: (id: number) => api.delete<void>(`/preventivas/${id}`),
}
