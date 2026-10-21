import { api } from './api'
import { montarMultipart } from './montarMultipart'
import type { AtualizarLojaPayload, Loja, NovaLojaPayload } from '../tipos/loja'

export const servicoLojas = {
  listar: () => api.get<Loja[]>('/lojas'),

  obterPorId: (id: number) => api.get<Loja>(`/lojas/${id}`),

  // Multipart (parte `dados` + `foto` opcional), como em servicoMaquinas. No PUT, sem foto
  // o servidor mantém a atual.
  criar: (dados: NovaLojaPayload, foto?: File) =>
    api.post<Loja>('/lojas', montarMultipart(dados, { foto })),

  atualizar: ({ id, ...dados }: AtualizarLojaPayload, foto?: File) =>
    api.put<Loja>(`/lojas/${id}`, montarMultipart(dados, { foto })),

  deletar: (id: number) => api.delete<void>(`/lojas/${id}`),
}
