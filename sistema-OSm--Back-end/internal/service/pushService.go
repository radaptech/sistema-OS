package service

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/radaptech/sistema-OSm--Back-end/internal/helper"
)

// EnviadorPush é o que NotificacaoService usa pra mandar um Web Push -- nunca a
// lib direto, pra os testes trocarem por um fake (mesmo motivo de
// NotificadorInterface e EnviadorEmailRecuperacao). Opcional: NotificacaoService
// com Push nil grava a notificação e não manda push nenhum, que é o que
// acontece num ambiente sem VAPID configurado.
type EnviadorPush interface {
	// ChavePublica é a chave VAPID pública que o navegador precisa pra se
	// inscrever (applicationServerKey). Vai pro front em GET /push/chave-publica.
	ChavePublica() string
	// Enviar devolve o status HTTP do serviço de push mesmo quando ele recusa:
	// 404/410 é "essa inscrição morreu", e quem decide apagar é quem chama.
	// err só pra falha de rede/cifra, quando nem houve resposta.
	Enviar(ctx context.Context, destino DestinoPush, mensagem []byte, urgente bool) (status int, err error)
}

// DestinoPush é uma inscrição já salva: pra onde mandar e com que chaves cifrar.
type DestinoPush struct {
	Endpoint string
	P256dh   string
	Auth     string
}

// ttlPush é quanto o serviço de push guarda a mensagem se o aparelho estiver
// desligado/sem rede. Depois disso descarta -- e tudo bem: a notificação está
// no sininho. Um dia cobre "o celular ficou sem bateria de noite".
const ttlPush = 24 * 60 * 60

// WebPush é o EnviadorPush de verdade (github.com/SherClockHolmes/webpush-go):
// cifra a mensagem (RFC 8291) e assina com VAPID (RFC 8292) -- é a assinatura
// que prova pro Google/Apple/Mozilla que o envio veio do dono da chave pública
// com que o navegador se inscreveu.
type WebPush struct {
	chavePublica string
	chavePrivada string
	assunto      string
	client       *http.Client
}

// NewWebPush devolve nil (push desligado) sem as duas chaves -- quem pluga
// (router.go) só atribui a NotificacaoService.Push quando não é nil, senão a
// interface guardaria um ponteiro nil e deixaria de ser nil.
//
// assunto é o contato do dono do servidor que vai no JWT do VAPID (os serviços
// de push usam pra avisar de abuso). A lib já põe o "mailto:" na frente de
// e-mail -- tirar aqui evita o "mailto:mailto:" de quem escreveu completo.
func NewWebPush(chavePublica, chavePrivada, assunto string) *WebPush {

	if chavePublica == "" || chavePrivada == "" {
		return nil
	}

	return &WebPush{
		chavePublica: chavePublica,
		chavePrivada: chavePrivada,
		assunto:      strings.TrimPrefix(assunto, "mailto:"),
		client: &http.Client{
			Timeout: 10 * time.Second,
			// Nunca seguir redirect: o host já foi conferido contra a lista de
			// serviços de push (validarEndpointPush), e um 30x levaria o POST
			// pra um lugar que ninguém conferiu.
			CheckRedirect: func(*http.Request, []*http.Request) error {
				return http.ErrUseLastResponse
			},
		},
	}
}

func (w *WebPush) ChavePublica() string {
	return w.chavePublica
}

func (w *WebPush) Enviar(ctx context.Context, destino DestinoPush, mensagem []byte, urgente bool) (int, error) {

	// Conferido de novo no envio, não só ao salvar: a linha pode ter vindo de
	// antes de uma regra mudar, e o custo é um url.Parse.
	if err := validarEndpointPush(destino.Endpoint); err != nil {
		return 0, err
	}

	urgencia := webpush.UrgencyNormal
	if urgente {
		urgencia = webpush.UrgencyHigh
	}

	resp, err := webpush.SendNotificationWithContext(ctx, mensagem, &webpush.Subscription{
		Endpoint: destino.Endpoint,
		Keys:     webpush.Keys{P256dh: destino.P256dh, Auth: destino.Auth},
	}, &webpush.Options{
		HTTPClient:      w.client,
		Subscriber:      w.assunto,
		VAPIDPublicKey:  w.chavePublica,
		VAPIDPrivateKey: w.chavePrivada,
		TTL:             ttlPush,
		Urgency:         urgencia,
	})
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	// Drena um pouco do corpo pra conexão voltar pro pool do client.
	io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))

	return resp.StatusCode, nil
}

// hostsPush são os serviços de push dos navegadores -- os únicos lugares para
// onde o servidor aceita fazer POST. Sufixo com ponto na frente casa
// subdomínio (o Edge usa wns2-xxx.notify.windows.com).
//
// ⚠️ Sem esta lista o endpoint é uma URL livre que o cliente manda e o servidor
// chama: um usuário logado faria a API bater em serviço interno (SSRF). Navegador
// novo com outro serviço de push entra aqui.
var hostsPush = []string{
	"fcm.googleapis.com",                // Chrome, Opera, Samsung Internet
	"android.googleapis.com",            // Chrome, inscrições antigas
	"updates.push.services.mozilla.com", // Firefox
	"web.push.apple.com",                // Safari (macOS) e iPhone (PWA instalado)
	".push.apple.com",
	".notify.windows.com", // Edge
}

func validarEndpointPush(endpoint string) error {

	if len(endpoint) > 2048 {
		return fmt.Errorf("%w: endpoint de push grande demais", helper.ErrValidacao)
	}

	u, err := url.Parse(endpoint)
	if err != nil || u.Scheme != "https" || u.Host == "" || u.User != nil {
		return fmt.Errorf("%w: endpoint de push inválido", helper.ErrValidacao)
	}
	// Porta explícita não existe nos serviços reais; aceitar abriria
	// "fcm.googleapis.com:8080" pra qualquer coisa que resolva ali.
	if u.Port() != "" {
		return fmt.Errorf("%w: endpoint de push inválido", helper.ErrValidacao)
	}

	host := strings.ToLower(u.Hostname())
	for _, permitido := range hostsPush {
		if host == permitido || (strings.HasPrefix(permitido, ".") && strings.HasSuffix(host, permitido)) {
			return nil
		}
	}

	return fmt.Errorf("%w: serviço de push não reconhecido (%s)", helper.ErrValidacao, host)
}

// validarChavesPush confere o formato das chaves antes de salvar: chave
// quebrada só apareceria no primeiro envio, como erro de cifra, longe de quem
// mandou. p256dh é um ponto P-256 não comprimido (65 bytes, começa em 0x04);
// auth, 16 bytes.
func validarChavesPush(p256dh, auth string) error {

	chave, err := decodificarBase64Push(p256dh)
	if err != nil || len(chave) != 65 || chave[0] != 0x04 {
		return fmt.Errorf("%w: chave p256dh inválida", helper.ErrValidacao)
	}

	segredo, err := decodificarBase64Push(auth)
	if err != nil || len(segredo) != 16 {
		return fmt.Errorf("%w: chave auth inválida", helper.ErrValidacao)
	}

	return nil
}

// O navegador entrega base64url sem padding, mas há cliente que manda com
// padding ou no alfabeto padrão -- a lib aceita os quatro, então aqui também.
func decodificarBase64Push(texto string) ([]byte, error) {

	for _, enc := range []*base64.Encoding{base64.RawURLEncoding, base64.URLEncoding, base64.RawStdEncoding, base64.StdEncoding} {
		if b, err := enc.DecodeString(texto); err == nil {
			return b, nil
		}
	}
	return nil, errors.New("base64 inválido")
}
