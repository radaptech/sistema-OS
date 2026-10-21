import { api } from './api'
import { montarQuery } from './montarQuery'
import type { ContagemNaoLidas, Notificacao } from '../tipos/notificacao'
import type { RespostaPaginada } from '../tipos/paginacao'

// Sempre as do usuário logado -- o servidor tira o dono do token, nunca da URL.
export const servicoNotificacoes = {
  listar: (pagina: number) =>
    api.get<RespostaPaginada<Notificacao>>(
      `/notificacoes${montarQuery({ pagina })}`,
    ),

  contarNaoLidas: () => api.get<ContagemNaoLidas>('/notificacoes/nao-lidas'),

  marcarLida: (id: number) =>
    api.post<ContagemNaoLidas>(`/notificacoes/${id}/lida`),

  marcarTodasLidas: () => api.post<ContagemNaoLidas>('/notificacoes/lidas'),
}
