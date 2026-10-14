package controller

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/radaptech/sistema-OSm--Back-end/internal/helper"
	"github.com/radaptech/sistema-OSm--Back-end/internal/model"
)

type NotificacaoServiceInterface interface {
	ListarNotificacoes(ctx context.Context, tenantId, usuarioId int64, pagina int32) (model.RespostaPaginada[model.Notificacao], error)
	ContarNaoLidas(ctx context.Context, tenantId, usuarioId int64) (model.ContagemNaoLidas, error)
	MarcarComoLida(ctx context.Context, tenantId, usuarioId, id int64) (model.ContagemNaoLidas, error)
	MarcarTodasComoLidas(ctx context.Context, tenantId, usuarioId int64) (model.ContagemNaoLidas, error)
}

// NotificacaoController serve a central de notificações (o sininho). Todas as
// rotas são do próprio usuário: o id vem do token (atorDaRota), nunca da URL
// -- não existe "ver as notificações de outro", nem pro administrador.
type NotificacaoController struct {
	service NotificacaoServiceInterface
}

func NewNotificacaoController(service NotificacaoServiceInterface) *NotificacaoController {

	return &NotificacaoController{
		service: service,
	}
}

// Listar é GET /notificacoes?pagina= -- RespostaPaginada, mais novas primeiro.
func (n *NotificacaoController) Listar() gin.HandlerFunc {

	return func(ctx *gin.Context) {

		tenantId, ok := tenantDaRota(ctx)
		if !ok {
			return
		}

		usuarioId, _, ok := atorDaRota(ctx)
		if !ok {
			return
		}

		pagina := int32(1)
		if bruto := ctx.Query("pagina"); bruto != "" {
			p, err := strconv.Atoi(bruto)
			if err != nil || p < 1 {
				ctx.JSON(http.StatusBadRequest, gin.H{"error": "pagina inválida"})
				return
			}
			pagina = int32(p)
		}

		resposta, err := n.service.ListarNotificacoes(ctx.Request.Context(), tenantId, usuarioId, pagina)
		if err != nil {
			slog.ErrorContext(ctx.Request.Context(), "listar notificações", "tenant", tenantId, "usuario", usuarioId, "err", err)
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao listar notificações"})
			return
		}

		ctx.JSON(http.StatusOK, resposta)
	}
}

// NaoLidas é GET /notificacoes/nao-lidas -- { total }, o número do sininho.
func (n *NotificacaoController) NaoLidas() gin.HandlerFunc {

	return func(ctx *gin.Context) {

		tenantId, ok := tenantDaRota(ctx)
		if !ok {
			return
		}

		usuarioId, _, ok := atorDaRota(ctx)
		if !ok {
			return
		}

		contagem, err := n.service.ContarNaoLidas(ctx.Request.Context(), tenantId, usuarioId)
		if err != nil {
			slog.ErrorContext(ctx.Request.Context(), "contar notificações não lidas", "tenant", tenantId, "usuario", usuarioId, "err", err)
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao contar notificações"})
			return
		}

		ctx.JSON(http.StatusOK, contagem)
	}
}

// MarcarLida é POST /notificacoes/:id/lida -- responde a contagem nova de não
// lidas. Notificação de outro usuário é 404, igual a uma inexistente.
func (n *NotificacaoController) MarcarLida() gin.HandlerFunc {

	return func(ctx *gin.Context) {

		id, ok := idDaRota(ctx)
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

		contagem, err := n.service.MarcarComoLida(ctx.Request.Context(), tenantId, usuarioId, id)
		if err != nil {

			switch {
			case errors.Is(err, helper.ErrNaoEncontrado):
				ctx.JSON(http.StatusNotFound, gin.H{"error": "notificação não encontrada"})
			default:
				slog.ErrorContext(ctx.Request.Context(), "marcar notificação como lida", "tenant", tenantId, "usuario", usuarioId, "notificacao", id, "err", err)
				ctx.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao marcar notificação como lida"})
			}
			return
		}

		ctx.JSON(http.StatusOK, contagem)
	}
}

// MarcarTodasLidas é POST /notificacoes/lidas -- responde a contagem nova.
func (n *NotificacaoController) MarcarTodasLidas() gin.HandlerFunc {

	return func(ctx *gin.Context) {

		tenantId, ok := tenantDaRota(ctx)
		if !ok {
			return
		}

		usuarioId, _, ok := atorDaRota(ctx)
		if !ok {
			return
		}

		contagem, err := n.service.MarcarTodasComoLidas(ctx.Request.Context(), tenantId, usuarioId)
		if err != nil {
			slog.ErrorContext(ctx.Request.Context(), "marcar todas as notificações como lidas", "tenant", tenantId, "usuario", usuarioId, "err", err)
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao marcar notificações como lidas"})
			return
		}

		ctx.JSON(http.StatusOK, contagem)
	}
}
