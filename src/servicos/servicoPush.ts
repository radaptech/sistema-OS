import { api } from './api'
import type { ConfiguracaoPush, InscricaoPush } from '../tipos/push'

// O aparelho inscrito recebe os avisos de quem está logado nele: o servidor tira o
// dono do token, e re-inscrever o mesmo endpoint troca o dono (upsert).
export const servicoPush = {
  obterChavePublica: () => api.get<ConfiguracaoPush>('/push/chave-publica'),

  inscrever: (inscricao: InscricaoPush) =>
    api.post<void>('/push/inscricoes', inscricao),

  // POST e não DELETE: o endpoint é uma URL longa e o api.delete não manda corpo.
  remover: (endpoint: string) =>
    api.post<void>('/push/inscricoes/remover', { endpoint }),
}
