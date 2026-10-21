// Web Push -- espelha model.ConfiguracaoPush / InscricaoPushPayload do back.

// GET /push/chave-publica. null = servidor sem VAPID configurado: o push está
// desligado lá, e o front nem oferece "Ativar notificações".
export interface ConfiguracaoPush {
  chavePublica: string | null
}

// POST /push/inscricoes -- o PushSubscription.toJSON() do navegador como vem (o
// `expirationTime` que ele inclui o back ignora).
export interface InscricaoPush {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

// O que o servidor manda dentro de cada push (service.MensagemPush no back) e o sw.js lê.
export interface PayloadPush {
  id: number
  tipo: string
  titulo: string
  corpo: string
  url: string
  naoLidas: number
}
