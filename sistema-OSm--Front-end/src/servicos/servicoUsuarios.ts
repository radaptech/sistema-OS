import { api } from './api'
import { montarQuery } from './montarQuery'
import type {
  AtualizarUsuarioPayload,
  NovoUsuarioPayload,
  Usuario,
} from '../tipos/usuario'
import type { RespostaPaginada } from '../tipos/paginacao'

export interface ParametrosListagemUsuarios {
  perfil?: Usuario['perfil']
  lojaId?: number
  busca?: string
  pagina?: number
}

// Superfície única de escrita para os quatro perfis, inclusive Técnico (que envia `area`
// e tem os setores ignorados pelo servidor).
export const servicoUsuarios = {
  listar: (parametros: ParametrosListagemUsuarios = {}) =>
    api.get<RespostaPaginada<Usuario>>(`/usuarios${montarQuery(parametros)}`),

  obterPorId: (id: number) => api.get<Usuario>(`/usuarios/${id}`),

  criar: (dados: NovoUsuarioPayload) => api.post<Usuario>('/usuarios', dados),

  atualizar: ({ id, ...dados }: AtualizarUsuarioPayload) =>
    api.put<Usuario>(`/usuarios/${id}`, dados),

  deletar: (id: number) => api.delete<void>(`/usuarios/${id}`),
}
