import { api } from './api'
import { montarQuery } from './montarQuery'
import type { Tecnico } from '../tipos/tecnico'

export interface ParametrosListagemTecnicos {
  lojaId?: number
}

// Projeção somente-leitura, usada no select de "Técnico Responsável". Criar, editar e
// excluir técnico passa por servicoUsuarios com perfil 'tecnico' — no banco é a mesma
// tabela, e manter duas superfícies de escrita permitiria o mesmo e-mail duas vezes.
export const servicoTecnicos = {
  listar: (parametros: ParametrosListagemTecnicos = {}) =>
    api.get<Tecnico[]>(`/tecnicos${montarQuery(parametros)}`),

  obterPorId: (id: number) => api.get<Tecnico>(`/tecnicos/${id}`),
}
