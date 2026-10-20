package model

// InscricaoPushPayload é o corpo de POST /push/inscricoes -- o mesmo formato de
// PushSubscription.toJSON() do navegador, pro front mandar a inscrição como ela
// vem (o `expirationTime` que o navegador inclui é ignorado pelo binding).
type InscricaoPushPayload struct {
	Endpoint string              `json:"endpoint" binding:"required"`
	Keys     ChavesInscricaoPush `json:"keys" binding:"required"`
}

// ChavesInscricaoPush são as chaves com que o servidor cifra cada mensagem pra
// aquele navegador (RFC 8291): p256dh é a chave pública do navegador, auth o
// segredo compartilhado. As duas em base64url, como o navegador entrega.
type ChavesInscricaoPush struct {
	P256dh string `json:"p256dh" binding:"required"`
	Auth   string `json:"auth" binding:"required"`
}

// RemocaoInscricaoPushPayload é o corpo de POST /push/inscricoes/remover.
type RemocaoInscricaoPushPayload struct {
	Endpoint string `json:"endpoint" binding:"required"`
}

// ConfiguracaoPush é a resposta de GET /push/chave-publica. ChavePublica nil
// quer dizer "push desligado neste servidor" (sem VAPID no ambiente): o front
// esconde o botão de ativar em vez de pedir uma permissão que não vai servir.
type ConfiguracaoPush struct {
	ChavePublica *string `json:"chavePublica"`
}
