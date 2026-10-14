package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/radaptech/sistema-OSm--Back-end/internal/helper"
	"github.com/radaptech/sistema-OSm--Back-end/internal/model"
	"github.com/radaptech/sistema-OSm--Back-end/middleware"
)

type pushServiceFake struct {
	err       error
	chave     *string
	usuarioId *int64
	userAgent *string
	endpoint  *string
}

func (p pushServiceFake) ChavePublicaPush() model.ConfiguracaoPush {
	return model.ConfiguracaoPush{ChavePublica: p.chave}
}

func (p pushServiceFake) SalvarInscricaoPush(_ context.Context, _, usuarioId int64, payload model.InscricaoPushPayload, userAgent string) error {
	*p.usuarioId, *p.userAgent, *p.endpoint = usuarioId, userAgent, payload.Endpoint
	return p.err
}

func (p pushServiceFake) RemoverInscricaoPush(_ context.Context, _, usuarioId int64, endpoint string) error {
	*p.usuarioId, *p.endpoint = usuarioId, endpoint
	return p.err
}

func requisicaoPush(metodo, corpo string) (*httptest.ResponseRecorder, *gin.Context) {
	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = httptest.NewRequest(metodo, "/push", strings.NewReader(corpo))
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Request.Header.Set("User-Agent", "Chrome no Android")
	ctx.Set(middleware.UserTenantId, int64(7))
	ctx.Set(middleware.UserId, int64(55))
	ctx.Set(middleware.UserPerfil, "tecnico")
	return w, ctx
}

func TestPushControllerStatus(t *testing.T) {

	gin.SetMode(gin.TestMode)

	const inscricao = `{"endpoint":"https://fcm.googleapis.com/fcm/send/x","expirationTime":null,"keys":{"p256dh":"BAAA","auth":"aaaa"}}`

	casos := []struct {
		nome   string
		acao   string
		corpo  string
		err    error
		status int
	}{
		{"inscrever ok (formato do toJSON, com expirationTime)", "inscrever", inscricao, nil, http.StatusNoContent},
		{"inscrever sem keys", "inscrever", `{"endpoint":"https://fcm.googleapis.com/fcm/send/x"}`, nil, http.StatusBadRequest},
		{"inscrever sem auth", "inscrever", `{"endpoint":"https://fcm.googleapis.com/fcm/send/x","keys":{"p256dh":"BAAA"}}`, nil, http.StatusBadRequest},
		{"inscrever endpoint recusado", "inscrever", inscricao, fmt.Errorf("%w: serviço de push não reconhecido", helper.ErrValidacao), http.StatusBadRequest},
		{"inscrever interno", "inscrever", inscricao, fmt.Errorf("conexão recusada"), http.StatusInternalServerError},
		{"remover ok", "remover", `{"endpoint":"https://fcm.googleapis.com/fcm/send/x"}`, nil, http.StatusNoContent},
		{"remover sem endpoint", "remover", `{}`, nil, http.StatusBadRequest},
		{"remover interno", "remover", `{"endpoint":"x"}`, fmt.Errorf("conexão recusada"), http.StatusInternalServerError},
	}

	for _, c := range casos {
		t.Run(c.nome, func(t *testing.T) {

			var usuarioId int64
			var userAgent, endpoint string
			ctrl := NewPushController(pushServiceFake{err: c.err, usuarioId: &usuarioId, userAgent: &userAgent, endpoint: &endpoint})

			w, ctx := requisicaoPush(http.MethodPost, c.corpo)
			if c.acao == "inscrever" {
				ctrl.Inscrever()(ctx)
			} else {
				ctrl.Remover()(ctx)
			}

			if w.Code != c.status {
				t.Errorf("status = %d, esperado %d (corpo: %s)", w.Code, c.status, w.Body.String())
			}
			if c.status != http.StatusBadRequest || c.err != nil {
				// Chegou no service: o dono é o do token.
				if usuarioId != 55 {
					t.Errorf("usuarioId = %d, esperado 55 (o do token)", usuarioId)
				}
			}
			if c.acao == "inscrever" && c.status == http.StatusNoContent && userAgent != "Chrome no Android" {
				t.Errorf("userAgent = %q", userAgent)
			}
		})
	}

	t.Run("chave pública: null sem VAPID, string com", func(t *testing.T) {
		chave := "BMZ..."
		for _, c := range []struct {
			chave  *string
			espera string
		}{{nil, `{"chavePublica":null}`}, {&chave, `{"chavePublica":"BMZ..."}`}} {
			w, ctx := requisicaoPush(http.MethodGet, "")
			NewPushController(pushServiceFake{chave: c.chave}).ChavePublica()(ctx)
			var corpo, esperado any
			json.Unmarshal(w.Body.Bytes(), &corpo)
			json.Unmarshal([]byte(c.espera), &esperado)
			if w.Code != http.StatusOK || fmt.Sprint(corpo) != fmt.Sprint(esperado) {
				t.Errorf("status=%d corpo=%s, esperado %s", w.Code, w.Body.String(), c.espera)
			}
		}
	})
}
