package controller

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/radaptech/sistema-OSm--Back-end/internal/helper"
	"github.com/radaptech/sistema-OSm--Back-end/internal/model"
	"github.com/radaptech/sistema-OSm--Back-end/middleware"
)

// notificacaoFake grava o usuário e a página que o service recebeu: é o que
// prova que o dono vem do token, nunca da URL.
type notificacaoFake struct {
	err       error
	usuarioId *int64
	pagina    *int32
}

func (n notificacaoFake) registrar(usuarioId int64) {
	if n.usuarioId != nil {
		*n.usuarioId = usuarioId
	}
}

func (n notificacaoFake) ListarNotificacoes(_ context.Context, _, usuarioId int64, pagina int32) (model.RespostaPaginada[model.Notificacao], error) {
	n.registrar(usuarioId)
	if n.pagina != nil {
		*n.pagina = pagina
	}
	return model.RespostaPaginada[model.Notificacao]{Dados: []model.Notificacao{}, Pagina: pagina}, n.err
}

func (n notificacaoFake) ContarNaoLidas(_ context.Context, _, usuarioId int64) (model.ContagemNaoLidas, error) {
	n.registrar(usuarioId)
	return model.ContagemNaoLidas{Total: 3}, n.err
}

func (n notificacaoFake) MarcarComoLida(_ context.Context, _, usuarioId, _ int64) (model.ContagemNaoLidas, error) {
	n.registrar(usuarioId)
	return model.ContagemNaoLidas{Total: 2}, n.err
}

func (n notificacaoFake) MarcarTodasComoLidas(_ context.Context, _, usuarioId int64) (model.ContagemNaoLidas, error) {
	n.registrar(usuarioId)
	return model.ContagemNaoLidas{}, n.err
}

func requisicaoNotificacao(metodo, caminho, id string) (*httptest.ResponseRecorder, *gin.Context) {
	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = httptest.NewRequest(metodo, caminho, nil)
	if id != "" {
		ctx.Params = gin.Params{{Key: "id", Value: id}}
	}
	ctx.Set(middleware.UserTenantId, int64(7))
	ctx.Set(middleware.UserId, int64(55))
	ctx.Set(middleware.UserPerfil, "tecnico")
	return w, ctx
}

func TestNotificacaoMapeiaErroParaStatus(t *testing.T) {

	gin.SetMode(gin.TestMode)

	interno := fmt.Errorf("conexão recusada")

	casos := []struct {
		nome    string
		acao    string
		caminho string
		id      string
		err     error
		status  int
	}{
		{"listar sucesso", "listar", "/notificacoes", "", nil, http.StatusOK},
		{"listar página 2", "listar", "/notificacoes?pagina=2", "", nil, http.StatusOK},
		{"listar página inválida", "listar", "/notificacoes?pagina=0", "", nil, http.StatusBadRequest},
		{"listar página não numérica", "listar", "/notificacoes?pagina=abc", "", nil, http.StatusBadRequest},
		{"listar interno", "listar", "/notificacoes", "", interno, http.StatusInternalServerError},

		{"não lidas sucesso", "naoLidas", "/notificacoes/nao-lidas", "", nil, http.StatusOK},
		{"não lidas interno", "naoLidas", "/notificacoes/nao-lidas", "", interno, http.StatusInternalServerError},

		{"marcar lida sucesso", "marcar", "/notificacoes/3/lida", "3", nil, http.StatusOK},
		{"marcar lida id malformado", "marcar", "/notificacoes/abc/lida", "abc", nil, http.StatusBadRequest},
		{"marcar lida alheia/inexistente", "marcar", "/notificacoes/999/lida", "999", helper.ErrNaoEncontrado, http.StatusNotFound},
		{"marcar lida interno", "marcar", "/notificacoes/3/lida", "3", interno, http.StatusInternalServerError},

		{"marcar todas sucesso", "todas", "/notificacoes/lidas", "", nil, http.StatusOK},
		{"marcar todas interno", "todas", "/notificacoes/lidas", "", interno, http.StatusInternalServerError},
	}

	for _, c := range casos {
		t.Run(c.nome, func(t *testing.T) {

			var usuarioId int64
			var pagina int32
			ctrl := NewNotificacaoController(notificacaoFake{err: c.err, usuarioId: &usuarioId, pagina: &pagina})

			var w *httptest.ResponseRecorder
			var ctx *gin.Context

			switch c.acao {
			case "listar":
				w, ctx = requisicaoNotificacao(http.MethodGet, c.caminho, "")
				ctrl.Listar()(ctx)
			case "naoLidas":
				w, ctx = requisicaoNotificacao(http.MethodGet, c.caminho, "")
				ctrl.NaoLidas()(ctx)
			case "marcar":
				w, ctx = requisicaoNotificacao(http.MethodPost, c.caminho, c.id)
				ctrl.MarcarLida()(ctx)
			case "todas":
				w, ctx = requisicaoNotificacao(http.MethodPost, c.caminho, "")
				ctrl.MarcarTodasLidas()(ctx)
			}

			if w.Code != c.status {
				t.Errorf("status = %d, esperado %d (corpo: %s)", w.Code, c.status, w.Body.String())
			}

			// Chegou no service: o usuário é o do token.
			if c.status != http.StatusBadRequest && usuarioId != 55 {
				t.Errorf("usuarioId no service = %d, esperado 55 (o do token)", usuarioId)
			}
			if c.nome == "listar página 2" && pagina != 2 {
				t.Errorf("página no service = %d, esperado 2", pagina)
			}
		})
	}
}
