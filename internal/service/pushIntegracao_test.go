package service

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"sync"
	"testing"

	"github.com/radaptech/sistema-OSm--Back-end/internal/helper"
	"github.com/radaptech/sistema-OSm--Back-end/internal/model"
)

// pushFake grava cada envio e responde o status configurado por endpoint
// (201 por padrão).
type pushFake struct {
	mu     sync.Mutex
	envios []envioPush
	status map[string]int
	chave  string
}

type envioPush struct {
	endpoint string
	mensagem MensagemPush
	urgente  bool
}

func (p *pushFake) ChavePublica() string { return p.chave }

func (p *pushFake) Enviar(_ context.Context, d DestinoPush, mensagem []byte, urgente bool) (int, error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	var m MensagemPush
	if err := json.Unmarshal(mensagem, &m); err != nil {
		return 0, err
	}
	p.envios = append(p.envios, envioPush{endpoint: d.Endpoint, mensagem: m, urgente: urgente})

	if s, ok := p.status[d.Endpoint]; ok {
		return s, nil
	}
	return http.StatusCreated, nil
}

func (p *pushFake) doEndpoint(endpoint string) []envioPush {
	var achados []envioPush
	for _, e := range p.envios {
		if e.endpoint == endpoint {
			achados = append(achados, e)
		}
	}
	return achados
}

// TestPushNaEntrega: entregar() grava e manda push pra TODOS os aparelhos dos
// destinatários, cada um com o próprio número de não lidas, o id da notificação
// (o service worker marca como lida no toque) e a urgência do tipo. Inscrição
// morta (410) é apagada; erro do serviço de push volta como erro, sem desfazer
// a notificação nem parar os outros aparelhos.
func TestPushNaEntrega(t *testing.T) {

	ctx := context.Background()
	pool := bancoDeTeste(t)
	svc := NewRepoNotificacao(pool)

	var tenantID int64
	if err := pool.QueryRow(ctx, `INSERT INTO empresa (subdominio, nome) VALUES ('push-entrega', 'Empresa Push') RETURNING id`).Scan(&tenantID); err != nil {
		t.Fatalf("erro ao criar empresa: %v", err)
	}
	usuario := func(email string) int64 {
		t.Helper()
		var id int64
		if err := pool.QueryRow(ctx, `INSERT INTO usuario (tenant_id, perfil, nome, email, senha_hash) VALUES ($1, 'gestor', 'X', $2, 'x') RETURNING id`, tenantID, email).Scan(&id); err != nil {
			t.Fatalf("erro ao criar usuário: %v", err)
		}
		return id
	}
	ana, beto, caio := usuario("ana@push.com"), usuario("beto@push.com"), usuario("caio@push.com")

	inscrever := func(usuarioId int64, endpoint string) {
		t.Helper()
		p256dh, auth := chavesNavegador(t)
		if err := svc.SalvarInscricaoPush(ctx, tenantID, usuarioId, model.InscricaoPushPayload{
			Endpoint: endpoint, Keys: model.ChavesInscricaoPush{P256dh: p256dh, Auth: auth},
		}, "teste"); err != nil {
			t.Fatalf("erro ao inscrever: %v", err)
		}
	}
	const (
		celularAna  = "https://fcm.googleapis.com/fcm/send/ana-celular"
		pcAna       = "https://updates.push.services.mozilla.com/wpush/v2/ana-pc"
		celularBeto = "https://web.push.apple.com/beto"
	)
	inscrever(ana, celularAna)
	inscrever(ana, pcAna)
	inscrever(beto, celularBeto)
	// caio não tem aparelho: recebe no sininho e pronto.

	// Ana já tinha uma não lida: o número do push dela tem que ser 2.
	if err := svc.entregar(ctx, tenantID, []int64{ana}, novaNotificacao{tipo: "os_concluida", titulo: "antiga", corpo: "c", url: "/painel-gestor"}); err != nil {
		t.Fatalf("erro: %v", err)
	}

	fake := &pushFake{}
	svc.Push = fake

	err := svc.entregar(ctx, tenantID, []int64{ana, beto, caio}, novaNotificacao{
		tipo: "solicitacao_nova", titulo: "Nova solicitação", corpo: "Forno", url: "/painel-gestor?solicitacao=9",
	})
	if err != nil {
		t.Fatalf("erro ao entregar: %v", err)
	}

	if len(fake.envios) != 3 {
		t.Fatalf("envios = %d, esperado 3 (2 aparelhos da Ana + 1 do Beto)", len(fake.envios))
	}
	for _, e := range fake.doEndpoint(celularAna) {
		if e.mensagem.NaoLidas != 2 || e.mensagem.Url != "/painel-gestor?solicitacao=9" || !e.urgente || e.mensagem.Id == 0 {
			t.Errorf("push da Ana = %+v", e)
		}
	}
	if e := fake.doEndpoint(celularBeto); len(e) != 1 || e[0].mensagem.NaoLidas != 1 {
		t.Errorf("push do Beto = %+v, esperado 1 com naoLidas 1", e)
	}
	// O id no push é o da notificação DAQUELE usuário (uma linha por destinatário).
	if fake.doEndpoint(celularAna)[0].mensagem.Id == fake.doEndpoint(celularBeto)[0].mensagem.Id {
		t.Error("Ana e Beto receberam o mesmo id de notificação")
	}

	t.Run("tipo informativo vai com urgência normal", func(t *testing.T) {
		fake.envios = nil
		svc.entregar(ctx, tenantID, []int64{beto}, novaNotificacao{tipo: "os_concluida", titulo: "t", corpo: "c", url: "/painel-gestor?os=1"})
		if len(fake.envios) != 1 || fake.envios[0].urgente {
			t.Errorf("envios = %+v", fake.envios)
		}
	})

	t.Run("410 apaga a inscrição; 500 mantém e vira erro", func(t *testing.T) {
		fake.envios = nil
		fake.status = map[string]int{celularAna: http.StatusGone, pcAna: http.StatusInternalServerError}

		err := svc.entregar(ctx, tenantID, []int64{ana}, novaNotificacao{tipo: "os_aberta", titulo: "t", corpo: "c", url: "/painel-tecnico?os=1"})
		if err == nil {
			t.Error("o 500 tinha que voltar como erro (vai pro log)")
		}

		var restantes []string
		linhas, _ := pool.Query(ctx, `SELECT endpoint FROM dispositivo_push WHERE usuario_id = $1 ORDER BY endpoint`, ana)
		for linhas.Next() {
			var e string
			linhas.Scan(&e)
			restantes = append(restantes, e)
		}
		if len(restantes) != 1 || restantes[0] != pcAna {
			t.Errorf("aparelhos da Ana = %v, esperado só o PC (o celular deu 410)", restantes)
		}

		// A notificação foi gravada mesmo com o push falhando.
		contagem, _ := svc.ContarNaoLidas(ctx, tenantID, ana)
		if contagem.Total != 3 {
			t.Errorf("não lidas da Ana = %d, esperado 3", contagem.Total)
		}
	})

	t.Run("sem Push configurado não manda nada", func(t *testing.T) {
		svc.Push = nil
		if err := svc.entregar(ctx, tenantID, []int64{beto}, novaNotificacao{tipo: "os_aberta", titulo: "t", corpo: "c", url: "/painel-tecnico?os=2"}); err != nil {
			t.Errorf("erro: %v", err)
		}
		if svc.ChavePublicaPush().ChavePublica != nil {
			t.Error("sem Push a chave pública tem que ser nil")
		}
	})
}

// TestInscricaoPush trava o dono do aparelho: re-inscrição do mesmo endpoint
// por outro usuário (logout + login no mesmo celular) troca o dono; remover
// só apaga o próprio; validação contra SSRF antes de gravar.
func TestInscricaoPush(t *testing.T) {

	ctx := context.Background()
	pool := bancoDeTeste(t)
	svc := NewRepoNotificacao(pool)

	var tenantID int64
	if err := pool.QueryRow(ctx, `INSERT INTO empresa (subdominio, nome) VALUES ('push-inscricao', 'Empresa Inscricao') RETURNING id`).Scan(&tenantID); err != nil {
		t.Fatalf("erro ao criar empresa: %v", err)
	}
	usuario := func(email string) int64 {
		t.Helper()
		var id int64
		if err := pool.QueryRow(ctx, `INSERT INTO usuario (tenant_id, perfil, nome, email, senha_hash) VALUES ($1, 'gestor', 'X', $2, 'x') RETURNING id`, tenantID, email).Scan(&id); err != nil {
			t.Fatalf("erro ao criar usuário: %v", err)
		}
		return id
	}
	ana, beto := usuario("ana@insc.com"), usuario("beto@insc.com")

	const celular = "https://fcm.googleapis.com/fcm/send/celular-compartilhado"
	p256dh, auth := chavesNavegador(t)
	payload := model.InscricaoPushPayload{Endpoint: celular, Keys: model.ChavesInscricaoPush{P256dh: p256dh, Auth: auth}}

	dono := func() (int64, int) {
		t.Helper()
		var id int64
		var n int
		pool.QueryRow(ctx, `SELECT coalesce(max(usuario_id), 0), count(*) FROM dispositivo_push WHERE endpoint = $1`, celular).Scan(&id, &n)
		return id, n
	}

	if err := svc.SalvarInscricaoPush(ctx, tenantID, ana, payload, "Chrome"); err != nil {
		t.Fatalf("erro: %v", err)
	}
	if id, n := dono(); id != ana || n != 1 {
		t.Fatalf("dono=%d linhas=%d", id, n)
	}

	t.Run("mesmo aparelho, outro usuário: troca o dono", func(t *testing.T) {
		if err := svc.SalvarInscricaoPush(ctx, tenantID, beto, payload, "Chrome"); err != nil {
			t.Fatalf("erro: %v", err)
		}
		if id, n := dono(); id != beto || n != 1 {
			t.Errorf("dono=%d linhas=%d, esperado o Beto numa linha só", id, n)
		}
	})

	t.Run("remover o aparelho de outro não apaga", func(t *testing.T) {
		if err := svc.RemoverInscricaoPush(ctx, tenantID, ana, celular); err != nil {
			t.Fatalf("erro: %v", err)
		}
		if _, n := dono(); n != 1 {
			t.Error("a Ana apagou o aparelho do Beto")
		}
	})

	t.Run("remover o próprio apaga, e de novo não é erro", func(t *testing.T) {
		if err := svc.RemoverInscricaoPush(ctx, tenantID, beto, celular); err != nil {
			t.Fatalf("erro: %v", err)
		}
		if err := svc.RemoverInscricaoPush(ctx, tenantID, beto, celular); err != nil {
			t.Errorf("segunda remoção: %v", err)
		}
		if _, n := dono(); n != 0 {
			t.Error("a inscrição continua lá")
		}
	})

	t.Run("endpoint fora dos serviços de push é recusado", func(t *testing.T) {
		ruim := payload
		ruim.Endpoint = "https://servico-interno.local/admin"
		if err := svc.SalvarInscricaoPush(ctx, tenantID, ana, ruim, ""); !errors.Is(err, helper.ErrValidacao) {
			t.Errorf("esperava ErrValidacao, veio %v", err)
		}
	})

	t.Run("usuário de outro tenant é recusado pela FK", func(t *testing.T) {
		var outro int64
		pool.QueryRow(ctx, `INSERT INTO empresa (subdominio, nome) VALUES ('push-outro', 'Outro') RETURNING id`).Scan(&outro)
		if err := svc.SalvarInscricaoPush(ctx, outro, ana, payload, ""); err == nil {
			t.Error("gravou aparelho com usuário de outro tenant")
		}
	})
}
