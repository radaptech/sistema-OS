package service

import (
	"context"
	"crypto/ecdh"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"

	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/radaptech/sistema-OSm--Back-end/internal/helper"
)

// chavesNavegador gera chaves no formato que o navegador entrega em
// PushSubscription.toJSON(): p256dh = ponto P-256 não comprimido, auth = 16
// bytes, os dois em base64url sem padding.
func chavesNavegador(t *testing.T) (p256dh, auth string) {
	t.Helper()

	privada, err := ecdh.P256().GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("gerar chave: %v", err)
	}
	segredo := make([]byte, 16)
	rand.Read(segredo)

	return base64.RawURLEncoding.EncodeToString(privada.PublicKey().Bytes()),
		base64.RawURLEncoding.EncodeToString(segredo)
}

// TestValidarEndpointPush trava a lista de serviços de push -- a defesa contra
// SSRF: o servidor faz POST na URL que o cliente mandou, então só pode ser um
// serviço de push de verdade.
func TestValidarEndpointPush(t *testing.T) {

	aceitos := []string{
		"https://fcm.googleapis.com/fcm/send/abc:APA91b",
		"https://updates.push.services.mozilla.com/wpush/v2/gAAAA",
		"https://web.push.apple.com/QGuQyavXutnMH",
		"https://wns2-bn3p.notify.windows.com/w/?token=BQYAAA",
		"https://FCM.googleapis.com/fcm/send/x",
	}
	for _, e := range aceitos {
		if err := validarEndpointPush(e); err != nil {
			t.Errorf("%s recusado: %v", e, err)
		}
	}

	recusados := map[string]string{
		"http":              "http://fcm.googleapis.com/fcm/send/x",
		"host qualquer":     "https://api.interna.local/admin",
		"sufixo enganoso":   "https://fcm.googleapis.com.evil.com/x",
		"prefixo enganoso":  "https://evilfcm.googleapis.com/x",
		"porta explícita":   "https://fcm.googleapis.com:8443/x",
		"userinfo":          "https://user@fcm.googleapis.com/x",
		"ip":                "https://169.254.169.254/latest/meta-data",
		"vazio":             "",
		"sem esquema":       "fcm.googleapis.com/fcm/send/x",
		"grande demais":     "https://fcm.googleapis.com/" + strings.Repeat("a", 2100),
		"windows sem ponto": "https://notify.windows.com.evil.com/x",
	}
	for nome, e := range recusados {
		if err := validarEndpointPush(e); !errors.Is(err, helper.ErrValidacao) {
			t.Errorf("%s (%q): esperava ErrValidacao, veio %v", nome, e, err)
		}
	}
}

func TestValidarChavesPush(t *testing.T) {

	p256dh, auth := chavesNavegador(t)
	if err := validarChavesPush(p256dh, auth); err != nil {
		t.Fatalf("chaves válidas recusadas: %v", err)
	}

	// Com padding também passa: há cliente que manda assim.
	if err := validarChavesPush(p256dh+"=", auth+"=="); err != nil {
		t.Errorf("chaves com padding recusadas: %v", err)
	}

	casos := map[string][2]string{
		"p256dh curta":    {base64.RawURLEncoding.EncodeToString(make([]byte, 33)), auth},
		"p256dh sem 0x04": {base64.RawURLEncoding.EncodeToString(make([]byte, 65)), auth},
		"auth curto":      {p256dh, base64.RawURLEncoding.EncodeToString(make([]byte, 8))},
		"não é base64":    {"@@@", auth},
		"auth vazio":      {p256dh, ""},
	}
	for nome, c := range casos {
		if err := validarChavesPush(c[0], c[1]); !errors.Is(err, helper.ErrValidacao) {
			t.Errorf("%s: esperava ErrValidacao, veio %v", nome, err)
		}
	}
}

func TestNewWebPush(t *testing.T) {

	if NewWebPush("", "privada", "x") != nil || NewWebPush("publica", "", "x") != nil {
		t.Error("sem as duas chaves tem que devolver nil (push desligado)")
	}
	if w := NewWebPush("publica", "privada", "mailto:contato@x.com"); w.assunto != "contato@x.com" {
		t.Errorf("assunto = %q, o mailto: tem que sair (a lib põe de novo)", w.assunto)
	}
}

// transporteGravador responde no lugar do serviço de push e guarda o pedido.
type transporteGravador struct {
	pedido *http.Request
	corpo  []byte
	status int
}

func (g *transporteGravador) RoundTrip(r *http.Request) (*http.Response, error) {
	g.pedido = r
	g.corpo, _ = io.ReadAll(r.Body)
	return &http.Response{StatusCode: g.status, Body: io.NopCloser(strings.NewReader("")), Header: http.Header{}, Request: r}, nil
}

// TestWebPushEnviar passa pela lib de verdade (cifra + VAPID), só sem rede: o
// transporte do client responde no lugar do Google. Confere os cabeçalhos que
// os serviços de push exigem e que o status volta como veio -- 410 é o que faz
// entregar() apagar a inscrição.
func TestWebPushEnviar(t *testing.T) {

	privada, publica, err := webpush.GenerateVAPIDKeys()
	if err != nil {
		t.Fatalf("gerar VAPID: %v", err)
	}
	p256dh, auth := chavesNavegador(t)
	destino := DestinoPush{Endpoint: "https://fcm.googleapis.com/fcm/send/abc", P256dh: p256dh, Auth: auth}

	t.Run("urgente, com VAPID e cifrado", func(t *testing.T) {
		w := NewWebPush(publica, privada, "mailto:contato@radaptech.com.br")
		gravador := &transporteGravador{status: http.StatusCreated}
		w.client.Transport = gravador

		status, err := w.Enviar(context.Background(), destino, []byte(`{"titulo":"oi"}`), true)
		if err != nil || status != http.StatusCreated {
			t.Fatalf("status=%d err=%v", status, err)
		}

		h := gravador.pedido.Header
		if gravador.pedido.Method != http.MethodPost || gravador.pedido.URL.String() != destino.Endpoint {
			t.Errorf("pedido = %s %s", gravador.pedido.Method, gravador.pedido.URL)
		}
		if h.Get("Content-Encoding") != "aes128gcm" || h.Get("TTL") != "86400" || h.Get("Urgency") != "high" {
			t.Errorf("cabeçalhos = %v", h)
		}
		if !strings.HasPrefix(h.Get("Authorization"), "vapid t=") || !strings.Contains(h.Get("Authorization"), "k="+publica) {
			t.Errorf("Authorization sem VAPID: %q", h.Get("Authorization"))
		}
		if strings.Contains(string(gravador.corpo), "oi") {
			t.Error("corpo saiu em texto puro -- devia estar cifrado")
		}
	})

	t.Run("normal e status repassado", func(t *testing.T) {
		w := NewWebPush(publica, privada, "contato@radaptech.com.br")
		gravador := &transporteGravador{status: http.StatusGone}
		w.client.Transport = gravador

		status, err := w.Enviar(context.Background(), destino, []byte(`{}`), false)
		if err != nil || status != http.StatusGone {
			t.Fatalf("status=%d err=%v, esperado 410 sem erro", status, err)
		}
		if gravador.pedido.Header.Get("Urgency") != "normal" {
			t.Errorf("Urgency = %q", gravador.pedido.Header.Get("Urgency"))
		}
	})

	t.Run("endpoint fora da lista nem sai", func(t *testing.T) {
		w := NewWebPush(publica, privada, "x")
		gravador := &transporteGravador{status: http.StatusCreated}
		w.client.Transport = gravador

		_, err := w.Enviar(context.Background(), DestinoPush{Endpoint: "https://interno.local/x", P256dh: p256dh, Auth: auth}, []byte(`{}`), false)
		if !errors.Is(err, helper.ErrValidacao) || gravador.pedido != nil {
			t.Errorf("err=%v, pedido feito=%v -- não podia ter saído", err, gravador.pedido != nil)
		}
	})

	t.Run("redirect não é seguido", func(t *testing.T) {
		w := NewWebPush(publica, privada, "x")
		chamadas := 0
		w.client.Transport = roundTripFunc(func(r *http.Request) (*http.Response, error) {
			chamadas++
			h := http.Header{}
			h.Set("Location", "https://interno.local/roubar")
			return &http.Response{StatusCode: http.StatusFound, Body: io.NopCloser(strings.NewReader("")), Header: h, Request: r}, nil
		})

		status, err := w.Enviar(context.Background(), destino, []byte(`{}`), false)
		if err != nil || status != http.StatusFound || chamadas != 1 {
			t.Errorf("status=%d err=%v chamadas=%d -- o 302 tinha que voltar sem segundo pedido", status, err, chamadas)
		}
	})
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
