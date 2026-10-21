package model

import (
	"github.com/radaptech/sistema-OSm--Back-end/config"
	"github.com/radaptech/sistema-OSm--Back-end/database/repository"
)

// Notificacao é um item da central de notificações (o sininho) -- sempre do
// próprio usuário. Url é um caminho relativo à origem do tenant
// ("/painel-gestor?solicitacao=12"), o destino do clique no sininho e do
// toque no push; ck_notificacao_url garante que nunca aponta pra fora.
//
// Lida é redundante com LidaEm de propósito: é o que a tela pinta, e o front
// não precisa saber que "não lida" é null.
type Notificacao struct {
	Id       int64          `json:"id"`
	Tipo     string         `json:"tipo"`
	Titulo   string         `json:"titulo"`
	Corpo    string         `json:"corpo"`
	Url      string         `json:"url"`
	Lida     bool           `json:"lida"`
	LidaEm   *config.DataBr `json:"lidaEm"`
	CriadoEm *config.DataBr `json:"criadoEm"`
}

// ContagemNaoLidas é a resposta de GET /notificacoes/nao-lidas e das duas
// rotas de marcar como lida: devolver a contagem nova junto poupa o front de
// um segundo request só pra atualizar o número do sininho/badge.
type ContagemNaoLidas struct {
	Total int64 `json:"total"`
}

func MontarNotificacao(l repository.ListarNotificacoesDoUsuarioRow) Notificacao {

	return Notificacao{
		Id:       l.ID,
		Tipo:     string(l.Tipo),
		Titulo:   l.Titulo,
		Corpo:    l.Corpo,
		Url:      l.Url,
		Lida:     l.LidaEm.Valid,
		LidaEm:   dataBrOuNil(l.LidaEm),
		CriadoEm: dataBrOuNil(l.CriadoEm),
	}
}
