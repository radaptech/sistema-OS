import { api } from './api'
import { montarMultipart } from './montarMultipart'
import { montarQuery } from './montarQuery'
import type {
  AtualizarSetorPayload,
  NovoSetorPayload,
  SetorCadastrado,
} from '../tipos/setor'

export interface ParametrosListagemSetores {
  lojaId?: number
}

export const servicoSetores = {
  listar: (parametros: ParametrosListagemSetores = {}) =>
    api.get<SetorCadastrado[]>(`/setores${montarQuery(parametros)}`),

  obterPorId: (id: number) => api.get<SetorCadastrado>(`/setores/${id}`),

  // Multipart (parte `dados` + `foto` opcional), como em servicoMaquinas. No PUT, sem foto
  // o servidor mantém a atual.
  criar: (dados: NovoSetorPayload, foto?: File) =>
    api.post<SetorCadastrado>('/setores', montarMultipart(dados, { foto })),

  atualizar: ({ id, ...dados }: AtualizarSetorPayload, foto?: File) =>
    api.put<SetorCadastrado>(`/setores/${id}`, montarMultipart(dados, { foto })),

  deletar: (id: number) => api.delete<void>(`/setores/${id}`),
}
