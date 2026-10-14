package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"

	"github.com/radaptech/sistema-OSm--Back-end/internal/helper"
	"github.com/radaptech/sistema-OSm--Back-end/internal/model"
)

// TestNotificacaoDestinatarios trava QUEM recebe: a solicitação nova vai pra
// todo gestor cujo escopo alcança o setor -- setor marcado ou loja inteira --
// e pra ninguém mais. Desde que o WhatsApp saiu, gestor sem telefone recebe
// (o filtro de telefone de ObterGestoresDoSetor era critério do WhatsApp).
func TestNotificacaoDestinatarios(t *testing.T) {

	ctx := context.Background()
	pool := bancoDeTeste(t)
	svcUsuario := NewRepoUsuario(pool)
	svc := NewRepoNotificacao(pool)

	var tenantID, lojaA, lojaB, padaria, acougue, setorLojaB int64
	if err := pool.QueryRow(ctx, `INSERT INTO empresa (subdominio, nome) VALUES ('notif-dest', 'Empresa Notif Dest') RETURNING id`).Scan(&tenantID); err != nil {
		t.Fatalf("erro ao criar empresa: %v", err)
	}
	for _, l := range []struct {
		nome string
		dest *int64
	}{{"Loja A", &lojaA}, {"Loja B", &lojaB}} {
		if err := pool.QueryRow(ctx, `INSERT INTO loja (tenant_id, nome) VALUES ($1, $2) RETURNING id`, tenantID, l.nome).Scan(l.dest); err != nil {
			t.Fatalf("erro ao criar loja: %v", err)
		}
	}
	for _, s := range []struct {
		loja int64
		nome string
		dest *int64
	}{{lojaA, "Padaria", &padaria}, {lojaA, "Açougue", &acougue}, {lojaB, "Padaria", &setorLojaB}} {
		if err := pool.QueryRow(ctx, `INSERT INTO setor (tenant_id, loja_id, nome) VALUES ($1, $2, $3) RETURNING id`, tenantID, s.loja, s.nome).Scan(s.dest); err != nil {
			t.Fatalf("erro ao criar setor: %v", err)
		}
	}

	gestor := func(nome string, lojas, setores []int64, total bool) int64 {
		t.Helper()
		u, err := svcUsuario.CadastrarUsuario(ctx, model.NovoUsuarioPayload{
			Nome: nome, Email: strings.ToLower(nome) + "@notif-dest.com", Perfil: "gestor", Senha: "senha-forte-123",
			LojasIds: lojas, SetoresIds: setores, AcessoTotalSetores: total,
		}, tenantID)
		if err != nil {
			t.Fatalf("erro ao criar gestor %s: %v", nome, err)
		}
		return u.Id
	}

	daPadaria := gestor("Ana", []int64{lojaA}, []int64{padaria}, false)
	daLojaInteira := gestor("Beto", []int64{lojaA}, nil, true)
	doAcougue := gestor("Caio", []int64{lojaA}, []int64{acougue}, false)
	daOutraLoja := gestor("Duda", []int64{lojaB}, nil, true)
	desativado := gestor("Edu", []int64{lojaA}, nil, true)
	if _, err := pool.Exec(ctx, `UPDATE usuario SET ativo = false WHERE id = $1`, desativado); err != nil {
		t.Fatalf("erro ao desativar gestor: %v", err)
	}

	solicitante := "Bruno"
	err := svc.NotificarNovaSolicitacao(ctx, tenantID, padaria, DadosNotificacao{
		Alvo: "Forno · PAT-1", Descricao: "Não esquenta", LojaNome: "Loja A", SetorNome: "Padaria",
		SolicitanteNome: &solicitante, SolicitacaoId: 42,
	})
	if err != nil {
		t.Fatalf("erro ao notificar: %v", err)
	}

	esperado := map[int64]int64{daPadaria: 1, daLojaInteira: 1, doAcougue: 0, daOutraLoja: 0, desativado: 0}
	for id, n := range esperado {
		contagem, err := svc.ContarNaoLidas(ctx, tenantID, id)
		if err != nil {
			t.Fatalf("erro ao contar: %v", err)
		}
		if contagem.Total != n {
			t.Errorf("usuário %d: %d não lidas, esperado %d", id, contagem.Total, n)
		}
	}

	pagina, err := svc.ListarNotificacoes(ctx, tenantID, daPadaria, 1)
	if err != nil {
		t.Fatalf("erro ao listar: %v", err)
	}
	if len(pagina.Dados) != 1 {
		t.Fatalf("esperava 1 notificação, veio %d", len(pagina.Dados))
	}
	n := pagina.Dados[0]
	if n.Tipo != "solicitacao_nova" || n.Url != "/painel-gestor?solicitacao=42" || n.Lida || n.CriadoEm == nil {
		t.Errorf("notificação = %+v", n)
	}
	if n.Titulo != "Nova solicitação · Loja A / Padaria" || n.Corpo != `Forno · PAT-1 — Bruno: "Não esquenta"` {
		t.Errorf("texto = %q / %q", n.Titulo, n.Corpo)
	}

	t.Run("preventiva vai pro técnico, com a url da OS", func(t *testing.T) {
		tecnico := tecnicoParaPreventiva(t, ctx, pool, tenantID)

		if err := svc.NotificarOSPreventiva(ctx, tenantID, tecnico, DadosNotificacao{
			Alvo: "Câmara Fria · PAT-2", Descricao: "Revisão", LojaNome: "Loja A", SetorNome: "Açougue", OrdemServicoId: 7,
		}); err != nil {
			t.Fatalf("erro ao notificar: %v", err)
		}

		pagina, err := svc.ListarNotificacoes(ctx, tenantID, tecnico, 1)
		if err != nil {
			t.Fatalf("erro ao listar: %v", err)
		}
		if len(pagina.Dados) != 1 || pagina.Dados[0].Tipo != "os_preventiva" || pagina.Dados[0].Url != "/painel-tecnico?os=7" {
			t.Errorf("notificações do técnico = %+v", pagina.Dados)
		}
	})

	t.Run("setor sem gestor não é erro", func(t *testing.T) {
		if err := svc.NotificarNovaSolicitacao(ctx, tenantID, setorLojaB+1000, DadosNotificacao{SolicitacaoId: 1}); err != nil {
			t.Errorf("esperava nil, veio %v", err)
		}
	})
}

// TestNotificacaoLeitura trava a paginação e o "lida": sempre só do próprio
// usuário, idempotente, e notificação alheia é 404 igual a inexistente.
func TestNotificacaoLeitura(t *testing.T) {

	ctx := context.Background()
	pool := bancoDeTeste(t)
	svc := NewRepoNotificacao(pool)

	var tenantID, outroTenant int64
	if err := pool.QueryRow(ctx, `INSERT INTO empresa (subdominio, nome) VALUES ('notif-leitura', 'Empresa Notif Leitura') RETURNING id`).Scan(&tenantID); err != nil {
		t.Fatalf("erro ao criar empresa: %v", err)
	}
	if err := pool.QueryRow(ctx, `INSERT INTO empresa (subdominio, nome) VALUES ('notif-outra', 'Outra Empresa') RETURNING id`).Scan(&outroTenant); err != nil {
		t.Fatalf("erro ao criar empresa: %v", err)
	}

	usuario := func(tenant int64, email string) int64 {
		t.Helper()
		var id int64
		if err := pool.QueryRow(ctx, `INSERT INTO usuario (tenant_id, perfil, nome, email, senha_hash) VALUES ($1, 'gestor', 'X', $2, 'x') RETURNING id`, tenant, email).Scan(&id); err != nil {
			t.Fatalf("erro ao criar usuário: %v", err)
		}
		return id
	}
	eu := usuario(tenantID, "eu@notif.com")
	outro := usuario(tenantID, "outro@notif.com")

	// 25 pra mim (página de 20 + 5), 1 pro outro. O título carrega a ordem de
	// criação pra conferir "mais novas primeiro".
	for i := 1; i <= 25; i++ {
		if err := svc.entregar(ctx, tenantID, []int64{eu}, novaNotificacao{
			tipo: "solicitacao_nova", titulo: fmt.Sprintf("n%02d", i), corpo: "c", url: "/painel-gestor",
		}); err != nil {
			t.Fatalf("erro ao gravar: %v", err)
		}
	}
	if err := svc.entregar(ctx, tenantID, []int64{outro}, novaNotificacao{
		tipo: "solicitacao_nova", titulo: "do outro", corpo: "c", url: "/painel-gestor",
	}); err != nil {
		t.Fatalf("erro ao gravar: %v", err)
	}

	p1, err := svc.ListarNotificacoes(ctx, tenantID, eu, 1)
	if err != nil {
		t.Fatalf("erro ao listar: %v", err)
	}
	p2, err := svc.ListarNotificacoes(ctx, tenantID, eu, 2)
	if err != nil {
		t.Fatalf("erro ao listar: %v", err)
	}
	if len(p1.Dados) != 20 || len(p2.Dados) != 5 || p1.Total != 25 || p1.TotalPaginas != 2 {
		t.Fatalf("paginação: p1=%d p2=%d total=%d páginas=%d", len(p1.Dados), len(p2.Dados), p1.Total, p1.TotalPaginas)
	}
	if p1.Dados[0].Titulo != "n25" || p2.Dados[4].Titulo != "n01" {
		t.Errorf("ordem: primeira=%q última=%q, esperado n25/n01", p1.Dados[0].Titulo, p2.Dados[4].Titulo)
	}

	alvo := p1.Dados[0].Id

	t.Run("marcar como lida devolve a contagem nova", func(t *testing.T) {
		contagem, err := svc.MarcarComoLida(ctx, tenantID, eu, alvo)
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		if contagem.Total != 24 {
			t.Errorf("não lidas = %d, esperado 24", contagem.Total)
		}
	})

	t.Run("marcar de novo é idempotente e não reescreve a hora", func(t *testing.T) {
		var antes, depois string
		pool.QueryRow(ctx, `SELECT lida_em::text FROM notificacao WHERE id = $1`, alvo).Scan(&antes)
		contagem, err := svc.MarcarComoLida(ctx, tenantID, eu, alvo)
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		pool.QueryRow(ctx, `SELECT lida_em::text FROM notificacao WHERE id = $1`, alvo).Scan(&depois)
		if contagem.Total != 24 || antes != depois || antes == "" {
			t.Errorf("total=%d lida_em antes=%q depois=%q", contagem.Total, antes, depois)
		}
	})

	t.Run("notificação de outro usuário é 404", func(t *testing.T) {
		if _, err := svc.MarcarComoLida(ctx, tenantID, outro, alvo); !errors.Is(err, helper.ErrNaoEncontrado) {
			t.Errorf("esperava ErrNaoEncontrado, veio %v", err)
		}
	})

	t.Run("mesmo usuário em outro tenant é 404", func(t *testing.T) {
		if _, err := svc.MarcarComoLida(ctx, outroTenant, eu, alvo); !errors.Is(err, helper.ErrNaoEncontrado) {
			t.Errorf("esperava ErrNaoEncontrado, veio %v", err)
		}
	})

	t.Run("inexistente é 404", func(t *testing.T) {
		if _, err := svc.MarcarComoLida(ctx, tenantID, eu, alvo+10_000); !errors.Is(err, helper.ErrNaoEncontrado) {
			t.Errorf("esperava ErrNaoEncontrado, veio %v", err)
		}
	})

	t.Run("marcar todas zera só as minhas", func(t *testing.T) {
		contagem, err := svc.MarcarTodasComoLidas(ctx, tenantID, eu)
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		if contagem.Total != 0 {
			t.Errorf("minhas não lidas = %d, esperado 0", contagem.Total)
		}
		doOutro, _ := svc.ContarNaoLidas(ctx, tenantID, outro)
		if doOutro.Total != 1 {
			t.Errorf("não lidas do outro = %d, esperado 1 (intocada)", doOutro.Total)
		}
	})

	t.Run("destinatário de outro tenant é recusado pela FK", func(t *testing.T) {
		err := svc.entregar(ctx, outroTenant, []int64{eu}, novaNotificacao{
			tipo: "solicitacao_nova", titulo: "t", corpo: "c", url: "/painel-gestor",
		})
		if err == nil {
			t.Error("esperava erro de FK, veio nil")
		}
	})

	t.Run("url pra fora do sistema é recusada pelo banco", func(t *testing.T) {
		for _, url := range []string{"https://evil.com", "//evil.com", `/\evil.com`} {
			err := svc.entregar(ctx, tenantID, []int64{eu}, novaNotificacao{
				tipo: "solicitacao_nova", titulo: "t", corpo: "c", url: url,
			})
			if err == nil {
				t.Errorf("url %q aceita, esperava recusa do ck_notificacao_url", url)
			}
		}
	})
}

// TestMontarNotificacoes trava texto e url de cada evento (puro, sem banco).
// A url é o contrato com o front: é dela que o painel abre o modal certo.
func TestMontarNotificacoes(t *testing.T) {

	tecnico, solicitante := "Tito", "Sara"
	d := DadosNotificacao{
		Alvo: "Forno · PAT-1", Descricao: "Não esquenta", LojaNome: "Loja A", SetorNome: "Padaria",
		SolicitanteNome: &solicitante, TecnicoNome: &tecnico, Urgencia: "Alta", MotivoRejeicao: "Duplicada",
		SolicitacaoId: 12, OrdemServicoId: 34,
	}

	casos := []struct {
		nome    string
		montada novaNotificacao
		tipo    string
		titulo  string
		corpo   string
		url     string
	}{
		{"nova", montarNovaSolicitacao(d), "solicitacao_nova",
			"Nova solicitação · Loja A / Padaria", `Forno · PAT-1 — Sara: "Não esquenta"`, "/painel-gestor?solicitacao=12"},
		{"aceita", montarSolicitacaoAceita(d), "solicitacao_aceita",
			"Solicitação aceita · Loja A / Padaria", "Forno · PAT-1 — virou OS com Tito.", "/minhas-solicitacoes?solicitacao=12"},
		{"rejeitada", montarSolicitacaoRejeitada(d), "solicitacao_rejeitada",
			"Solicitação rejeitada · Loja A / Padaria", `Forno · PAT-1 — motivo: "Duplicada"`, "/minhas-solicitacoes?solicitacao=12"},
		{"os aberta", montarOSAberta(d), "os_aberta",
			"Nova OS pra você · Loja A / Padaria", `Forno · PAT-1 — "Não esquenta" · Urgência Alta`, "/painel-tecnico?os=34"},
		{"preventiva", montarOSPreventiva(d), "os_preventiva",
			"Preventiva agendada · Loja A / Padaria", `Forno · PAT-1 — "Não esquenta". A OS já está no seu painel.`, "/painel-tecnico?os=34"},
		{"concluída", montarOSConcluida(d), "os_concluida",
			"OS concluída · Loja A / Padaria", "Forno · PAT-1 — encerrada por Tito.", "/painel-gestor?os=34"},
	}

	for _, c := range casos {
		t.Run(c.nome, func(t *testing.T) {
			m := c.montada
			if string(m.tipo) != c.tipo || m.titulo != c.titulo || m.corpo != c.corpo || m.url != c.url {
				t.Errorf("veio {%s | %s | %s | %s}\nesperado {%s | %s | %s | %s}", m.tipo, m.titulo, m.corpo, m.url, c.tipo, c.titulo, c.corpo, c.url)
			}
		})
	}
}
