package controller

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/radaptech/sistema-OSm--Back-end/internal/helper"
	"github.com/radaptech/sistema-OSm--Back-end/internal/model"
)

type PushServiceInterface interface {
	ChavePublicaPush() model.ConfiguracaoPush
	SalvarInscricaoPush(ctx context.Context, tenantId, usuarioId int64, payload model.InscricaoPushPayload, userAgent string) error
	RemoverInscricaoPush(ctx context.Context, tenantId, usuarioId int64, endpoint string) error
}

// PushController serve a inscrição de aparelhos no Web Push. Como as rotas de
// /notificacoes, o dono é sempre o usuário do token (atorDaRota): o aparelho
// inscrito recebe os avisos de quem estava logado nele.
type PushController struct {
	service PushServiceInterface
}

func NewPushController(service PushServiceInterface) *PushController {

	return &PushController{
		service: service,
	}
}

// ChavePublica é GET /push/chave-publica -- { chavePublica }, null quando o
// servidor não tem VAPID configurado (o front esconde o "Ativar notificações").
func (p *PushController) ChavePublica() gin.HandlerFunc {

	return func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, p.service.ChavePublicaPush())
	}
}

// Inscrever é POST /push/inscricoes, com a PushSubscription do navegador no
// corpo. 400 para endpoint fora dos serviços de push conhecidos ou chave
// malformada; 204 quando salvou (inclusive re-inscrição do mesmo aparelho).
func (p *PushController) Inscrever() gin.HandlerFunc {

	return func(ctx *gin.Context) {

		input, ok := corpoJSON[model.InscricaoPushPayload](ctx)
		if !ok {
			return
		}

		tenantId, ok := tenantDaRota(ctx)
		if !ok {
			return
		}

		usuarioId, _, ok := atorDaRota(ctx)
		if !ok {
			return
		}

		if err := p.service.SalvarInscricaoPush(ctx.Request.Context(), tenantId, usuarioId, input, ctx.Request.UserAgent()); err != nil {

			switch {
			case errors.Is(err, helper.ErrValidacao):
				ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			default:
				slog.ErrorContext(ctx.Request.Context(), "salvar inscrição de push", "tenant", tenantId, "usuario", usuarioId, "err", err)
				ctx.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao ativar as notificações"})
			}
			return
		}

		// WriteHeaderNow: só Status() deixa o cabeçalho pro fim do handler, e o
		// 204 sem corpo nunca seria escrito por quem chama o handler direto.
		ctx.Status(http.StatusNoContent)
		ctx.Writer.WriteHeaderNow()
	}
}

// Remover é POST /push/inscricoes/remover -- o front chama no logout e ao
// desativar. POST e não DELETE com corpo: o endpoint (uma URL longa) não cabe
// bem num :id de rota, e o api.delete do front não manda corpo. Idempotente:
// sempre 204.
func (p *PushController) Remover() gin.HandlerFunc {

	return func(ctx *gin.Context) {

		input, ok := corpoJSON[model.RemocaoInscricaoPushPayload](ctx)
		if !ok {
			return
		}

		tenantId, ok := tenantDaRota(ctx)
		if !ok {
			return
		}

		usuarioId, _, ok := atorDaRota(ctx)
		if !ok {
			return
		}

		if err := p.service.RemoverInscricaoPush(ctx.Request.Context(), tenantId, usuarioId, input.Endpoint); err != nil {
			slog.ErrorContext(ctx.Request.Context(), "remover inscrição de push", "tenant", tenantId, "usuario", usuarioId, "err", err)
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao desativar as notificações"})
			return
		}

		// WriteHeaderNow: só Status() deixa o cabeçalho pro fim do handler, e o
		// 204 sem corpo nunca seria escrito por quem chama o handler direto.
		ctx.Status(http.StatusNoContent)
		ctx.Writer.WriteHeaderNow()
	}
}
