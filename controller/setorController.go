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

type SetorServiceInterface interface {
	CadastrarSetor(ctx context.Context, tenantID int64, payload model.NovoSetorPayload) (model.Setor, error)
	ObterSetor(ctx context.Context, tenantID, id int64) (model.Setor, error)
	ListarSetores(ctx context.Context, tenantID int64, idLoja *int64) ([]model.Setor, error)
	AtualizarSetor(ctx context.Context, tenantId, id int64, payload model.NovoSetorPayload) (model.Setor, error)
	DesativarSetor(ctx context.Context, tenantID, id int64) error
}

// bucketFotos é o bucket do R2 da foto de cadastro (R2_BUCKET_NAME_IMG_SETORES), lido
// pelo router -- mesma escolha de MaquinaController: o bucket é de wiring, não
// coluna do banco.
type SetorController struct {
	service     SetorServiceInterface
	bucketFotos string
}

func NewSetorController(service SetorServiceInterface, bucketFotos string) *SetorController {

	return &SetorController{
		service:     service,
		bucketFotos: bucketFotos,
	}
}

// resolverFoto troca, no lugar, a chave do R2 pela URL assinada (assinarFoto,
// controller/foto.go).
func (s *SetorController) resolverFoto(ctx context.Context, setor *model.Setor) {
	setor.FotoUrl = assinarFoto(ctx, s.bucketFotos, setor.FotoUrl, "setor", setor.Id)
}

// Cadastrar é POST /setores.
//
// O 422 aqui é o caso "loja inexistente, de outro tenant ou desativada": o
// service recusa antes de gravar, e a mensagem diz qual dos três -- é ela que
// vira o toast, então vai inteira na resposta.
func (s *SetorController) Cadastrar() gin.HandlerFunc {

	return func(ctx *gin.Context) {

		tenantId, okTenant := tenantDaRota(ctx)
		if !okTenant {
			return
		}

		// Tenant antes do corpo: a foto sobe pro R2 já na leitura, numa key
		// prefixada pelo tenant.
		input, chave, ok := corpoComFoto[model.NovoSetorPayload](ctx, tenantId, s.bucketFotos, "setor")
		if !ok {
			return
		}
		input.FotoChave = chave

		setor, err := s.service.CadastrarSetor(ctx.Request.Context(), tenantId, input)
		if err != nil {

			switch {
			case errors.Is(err, helper.ErrValidacao):
				ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			case errors.Is(err, helper.ErrDadoDuplicado):
				ctx.JSON(http.StatusConflict, gin.H{"error": "já existe um setor com esse nome nesta loja"})
			case errors.Is(err, helper.ErrConflitoIntegridade):
				ctx.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
			default:
				slog.ErrorContext(ctx.Request.Context(), "cadastrar setor", "tenant", tenantId, "err", err)
				ctx.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao cadastrar setor"})
			}
			return
		}

		s.resolverFoto(ctx.Request.Context(), &setor)

		ctx.JSON(http.StatusCreated, setor)
	}
}

// Obter é GET /setores/:id.
func (s *SetorController) Obter() gin.HandlerFunc {

	return func(ctx *gin.Context) {

		id, ok := idDaRota(ctx)
		if !ok {
			return
		}

		tenantId, okTenant := tenantDaRota(ctx)
		if !okTenant {
			return
		}

		setor, err := s.service.ObterSetor(ctx.Request.Context(), tenantId, id)
		if err != nil {

			switch {
			case errors.Is(err, helper.ErrNaoEncontrado):
				ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			default:
				slog.ErrorContext(ctx.Request.Context(), "obter setor", "id", id, "tenant", tenantId, "err", err)
				ctx.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao obter setor"})
			}
			return
		}

		s.resolverFoto(ctx.Request.Context(), &setor)

		ctx.JSON(http.StatusOK, setor)
	}
}

// Listar é GET /setores, com ?lojaId= opcional -- o front usa os dois modos: o
// select em cascata pede os setores de uma loja, e o agrupamento do painel do
// gestor pede todos. Ausente ou vazio = não filtra (montarQuery já descarta
// vazio do lado de lá). Array simples, sem paginação.
func (s *SetorController) Listar() gin.HandlerFunc {

	return func(ctx *gin.Context) {

		tenantId, ok := tenantDaRota(ctx)
		if !ok {
			return
		}

		lojaId, ok := idDeQuery(ctx, "lojaId")
		if !ok {
			return
		}

		setores, err := s.service.ListarSetores(ctx.Request.Context(), tenantId, lojaId)
		if err != nil {
			slog.ErrorContext(ctx.Request.Context(), "listar setores", "tenant", tenantId, "err", err)
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao listar setores"})
			return
		}

		// Índice, não valor: o range daria uma cópia e a URL assinada não
		// voltaria pro slice da resposta.
		for i := range setores {
			s.resolverFoto(ctx.Request.Context(), &setores[i])
		}

		ctx.JSON(http.StatusOK, setores)
	}
}

// Atualizar é PUT /setores/:id.
func (s *SetorController) Atualizar() gin.HandlerFunc {

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
		input, chave, ok := corpoComFoto[model.NovoSetorPayload](ctx, tenantId, s.bucketFotos, "setor")
		if !ok {
			return
		}
		input.FotoChave = chave

		setor, err := s.service.AtualizarSetor(ctx.Request.Context(), tenantId, id, input)
		if err != nil {

			switch {
			case errors.Is(err, helper.ErrValidacao):
				ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			case errors.Is(err, helper.ErrDadoDuplicado):
				ctx.JSON(http.StatusConflict, gin.H{"error": "já existe um setor com esse nome nesta loja"})
			case errors.Is(err, helper.ErrNaoEncontrado):
				ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			case errors.Is(err, helper.ErrConflitoIntegridade):
				ctx.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
			default:
				slog.ErrorContext(ctx.Request.Context(), "atualizar setor", "id", id, "tenant", tenantId, "err", err)
				ctx.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao atualizar setor"})
			}
			return
		}

		s.resolverFoto(ctx.Request.Context(), &setor)

		ctx.JSON(http.StatusOK, setor)
	}
}

// Desativar é DELETE /setores/:id -- soft delete (ativo = false). Sem 422 de
// "em uso": máquina e OS apontam pro setor, e é por isso que o delete é soft.
func (s *SetorController) Desativar() gin.HandlerFunc {

	return func(ctx *gin.Context) {

		id, ok := idDaRota(ctx)
		if !ok {
			return
		}

		tenantId, okTenant := tenantDaRota(ctx)
		if !okTenant {
			return
		}

		if err := s.service.DesativarSetor(ctx.Request.Context(), tenantId, id); err != nil {

			switch {
			case errors.Is(err, helper.ErrNaoEncontrado):
				ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			case errors.Is(err, helper.ErrConflitoIntegridade):
				ctx.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
			default:
				slog.ErrorContext(ctx.Request.Context(), "desativar setor", "id", id, "tenant", tenantId, "err", err)
				ctx.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao desativar setor"})
			}
			return
		}

		ctx.JSON(http.StatusOK, gin.H{"message": "setor desativado"})
	}
}
