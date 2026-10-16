import { api } from './api'
import { montarMultipart } from './montarMultipart'
import type {
  AtualizarEmpresaTerceirizadaPayload,
  EmpresaTerceirizada,
  NovaEmpresaTerceirizadaPayload,
} from '../tipos/empresaTerceirizada'

const BASE = '/empresas-terceirizadas'

export const servicoEmpresasTerceirizadas = {
  listar: () => api.get<EmpresaTerceirizada[]>(BASE),

  obterPorId: (id: number) => api.get<EmpresaTerceirizada>(`${BASE}/${id}`),

  // Multipart (parte `dados` + `foto` opcional), como em servicoMaquinas. No PUT, sem foto
  // o servidor mantém a atual.
  criar: (dados: NovaEmpresaTerceirizadaPayload, foto?: File) =>
    api.post<EmpresaTerceirizada>(BASE, montarMultipart(dados, { foto })),

  atualizar: ({ id, ...dados }: AtualizarEmpresaTerceirizadaPayload, foto?: File) =>
    api.put<EmpresaTerceirizada>(`${BASE}/${id}`, montarMultipart(dados, { foto })),

  deletar: (id: number) => api.delete<void>(`${BASE}/${id}`),
}
