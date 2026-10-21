import { api } from './api'
import type { Empresa } from '../tipos/empresa'

export const servicoEmpresas = {
  listar: () => api.get<Empresa[]>('/empresas'),
}
