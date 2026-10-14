// Central de notificações (o sininho) -- espelha model.Notificacao do back. Uma por
// destinatário: "lida" é de cada usuário.
export type TipoNotificacao =
  | 'solicitacao_nova' // Solicitante abriu      -> gestores do setor
  | 'solicitacao_aceita' // Gestor abriu a OS    -> Solicitante
  | 'solicitacao_rejeitada' // Gestor rejeitou   -> Solicitante
  | 'os_aberta' // Gestor abriu a OS             -> Técnico
  | 'os_preventiva' // job abriu a OS            -> Técnico
  | 'os_concluida' // Técnico encerrou           -> gestores do setor

export interface Notificacao {
  id: number
  tipo: TipoNotificacao
  titulo: string
  corpo: string
  // Caminho relativo à origem do tenant ("/painel-gestor?solicitacao=12") -- o destino
  // do clique. O banco recusa qualquer coisa que não comece com uma "/" só.
  url: string
  lida: boolean
  lidaEm: string | null
  criadoEm: string
}

// Resposta de GET /notificacoes/nao-lidas e das duas rotas de marcar como lida: a
// contagem DEPOIS da ação, para o sininho atualizar sem outro request.
export interface ContagemNaoLidas {
  total: number
}
