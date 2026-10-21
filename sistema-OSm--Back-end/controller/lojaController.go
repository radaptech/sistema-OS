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

// A interface existe pelo mesmo motivo de LoginServiceInterface: LojaService
// guarda um *pgxpool.Pool concreto, então sem ela não dá pra testar handler
// sem banco.
type LojaServiceInterface interface {
	CadastrarLoja(ctx context.Context, tenantID int64, payload model.NovaLojaPayload) (model.Loja, error)
	ObterLoja(ctx context.Context, tenantId, id int64) (model.Loja, error)
	ListarLojas(ctx context.Context, tenantID int64) ([]model.Loja, error)
	AtualizarLoja(ctx context.Context, tenantID, id int64, payload model.NovaLojaPayload) (model.Loja, error)
	DesativarLoja(ctx context.Context, tenantID, id int64) error
	ListarEmpresas(ctx context.Context, tenantID int64) ([]model.Empresa, error)
}

// bucketFotos é o bucket do R2 da foto de cadastro (R2_BUCKET_NAME_IMG_LOJAS), lido
// pelo router -- mesma escolha de MaquinaController: o bucket é de wiring, não
// coluna do banco.
type LojaController struct {
	service     LojaServiceInterface
	bucketFotos string
}

func NewLojaController(service LojaServiceInterface, bucketFotos string) *LojaController {

	return &LojaController{
		service:     service,
		bucketFotos: bucketFotos,
	}
}

// resolverFoto troca, no lugar, a chave do R2 pela URL assinada (assinarFoto,
// controller/foto.go).
func (l *LojaController) resolverFoto(ctx context.Context, loja *model.Loja) {
	loja.FotoUrl = assinarFoto(ctx, l.bucketFotos, loja.FotoUrl, "loja", loja.Id)
}

// Cadastrar é POST /lojas.
func (l *LojaController) Cadastrar() gin.HandlerFunc {

	return func(ctx *gin.Context) {

		tenantId, okTenant := tenantDaRota(ctx)
		if !okTenant {
			return
		}

		// Tenant antes do corpo: a foto sobe pro R2 já na leitura, numa key
		// prefixada pelo tenant.
		input, chave, ok := corpoComFoto[model.NovaLojaPayload](ctx, tenantId, l.bucketFotos, "loja")
		if !ok {
			return
		}
		input.FotoChave = chave

		loja, err := l.service.CadastrarLoja(ctx.Request.Context(), tenantId, input)
		if err != nil {

			switch {
			case errors.Is(err, helper.ErrValidacao):
				ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			case errors.Is(err, helper.ErrDadoDuplicado):
				ctx.JSON(http.StatusConflict, gin.H{"error": "já existe uma loja com esse nome"})
			case errors.Is(err, helper.ErrConflitoIntegridade):
				ctx.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
			default:
				// Erro interno só no log: o erro cru do pgx carrega nome de
				// constraint/coluna e às vezes o SQL.
				slog.ErrorContext(ctx.Request.Context(), "cadastrar loja", "tenant", tenantId, "err", err)
				ctx.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao cadastrar loja"})
			}
			return
		}

		l.resolverFoto(ctx.Request.Context(), &loja)

		ctx.JSON(http.StatusCreated, loja)
	}
}

// Obter é GET /lojas/:id -- o que a tela de edição carrega.
func (l *LojaController) Obter() gin.HandlerFunc {

	return func(ctx *gin.Context) {

		id, ok := idDaRota(ctx)
		if !ok {
			return
		}

		tenantId, okTenant := tenantDaRota(ctx)
		if !okTenant {
			return
		}

		loja, err := l.service.ObterLoja(ctx.Request.Context(), tenantId, id)
		if err != nil {

			switch {
			case errors.Is(err, helper.ErrNaoEncontrado):
				ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			default:
				slog.ErrorContext(ctx.Request.Context(), "obter loja", "id", id, "tenant", tenantId, "err", err)
				ctx.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao obter loja"})
			}
			return
		}

		l.resolverFoto(ctx.Request.Context(), &loja)

		ctx.JSON(http.StatusOK, loja)
	}
}

// Listar é GET /lojas: array simples, sem paginação -- o front pagina e filtra
// no cliente. Sem switch de erro: listagem não tem erro de negócio, ou o banco
// respondeu ou caiu. Tenant sem loja é 200 com [].
func (l *LojaController) Listar() gin.HandlerFunc {

	return func(ctx *gin.Context) {

		tenantId, ok := tenantDaRota(ctx)
		if !ok {
			return
		}

		lojas, err := l.service.ListarLojas(ctx.Request.Context(), tenantId)
		if err != nil {
			slog.ErrorContext(ctx.Request.Context(), "listar lojas", "tenant", tenantId, "err", err)
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao listar lojas"})
			return
		}

		// Índice, não valor: o range daria uma cópia e a URL assinada não
		// voltaria pro slice da resposta.
		for i := range lojas {
			l.resolverFoto(ctx.Request.Context(), &lojas[i])
		}

		ctx.JSON(http.StatusOK, lojas)
	}
}

// Atualizar é PUT /lojas/:id. Aqui ErrNaoEncontrado é 404 e não o 422 do
// Atualizar de usuário: o corpo da loja não cita nenhuma outra entidade, então
// o :id é a única coisa que pode não existir.
func (l *LojaController) Atualizar() gin.HandlerFunc {

	return func(ctx *gin.Context) {

		id, ok := idDaRota(ctx)
		if !ok {
			return
		}

		tenantId, okTenant := tenantDaRota(ctx)
		if !okTenant {
			return
		}

		// Tenant antes do corpo: a foto sobe pro R2 já na leitura, numa key
		// prefixada pelo tenant.
		input, chave, ok := corpoComFoto[model.NovaLojaPayload](ctx, tenantId, l.bucketFotos, "loja")
		if !ok {
			return
		}
		input.FotoChave = chave

		loja, err := l.service.AtualizarLoja(ctx.Request.Context(), tenantId, id, input)
		if err != nil {

			switch {
			case errors.Is(err, helper.ErrValidacao):
				ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			case errors.Is(err, helper.ErrDadoDuplicado):
				ctx.JSON(http.StatusConflict, gin.H{"error": "já existe uma loja com esse nome"})
			case errors.Is(err, helper.ErrNaoEncontrado):
				ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			case errors.Is(err, helper.ErrConflitoIntegridade):
				ctx.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
			default:
				slog.ErrorContext(ctx.Request.Context(), "atualizar loja", "id", id, "tenant", tenantId, "err", err)
				ctx.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao atualizar loja"})
			}
			return
		}

		l.resolverFoto(ctx.Request.Context(), &loja)

		ctx.JSON(http.StatusOK, loja)
	}
}

// Desativar é DELETE /lojas/:id -- soft delete (ativa = false).
//
// O 422 aqui é o caso concreto de "loja ainda tem setor ativo": o service
// recusa em vez de cascatear, e a mensagem diz quantos setores faltam desativar
// -- é ela que o front mostra no toast, então não pode virar texto genérico.
func (l *LojaController) Desativar() gin.HandlerFunc {

	return func(ctx *gin.Context) {

		id, ok := idDaRota(ctx)
		if !ok {
			return
		}

		tenantId, okTenant := tenantDaRota(ctx)
		if !okTenant {
			return
		}

		if err := l.service.DesativarLoja(ctx.Request.Context(), tenantId, id); err != nil {

			switch {
			case errors.Is(err, helper.ErrNaoEncontrado):
				ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			case errors.Is(err, helper.ErrConflitoIntegridade):
				ctx.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
			default:
				slog.ErrorContext(ctx.Request.Context(), "desativar loja", "id", id, "tenant", tenantId, "err", err)
				ctx.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao desativar loja"})
			}
			return
		}

		ctx.JSON(http.StatusOK, gin.H{"message": "loja desativada"})
	}
}

// ListarEmpresas é GET /empresas -- alimenta o select de Empresa no cadastro
// de loja. Fica neste controller porque empresa não tem CRUD: é o tenant, e a
// única tela que pergunta por ela é a de loja.
func (l *LojaController) ListarEmpresas() gin.HandlerFunc {

	return func(ctx *gin.Context) {

		tenantId, ok := tenantDaRota(ctx)
		if !ok {
			return
		}

		empresas, err := l.service.ListarEmpresas(ctx.Request.Context(), tenantId)
		if err != nil {
			slog.ErrorContext(ctx.Request.Context(), "listar empresas", "tenant", tenantId, "err", err)
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao listar empresas"})
			return
		}

		ctx.JSON(http.StatusOK, empresas)
	}
}
