package service

import (
	"context"
	"errors"
	"testing"

	"github.com/radaptech/sistema-OSm--Back-end/internal/helper"
	"github.com/radaptech/sistema-OSm--Back-end/internal/model"
)

// TestHistoricoPreventiva cobre GET /preventivas/:id/historico: cada ciclo é a
// OS que o job abriu, mais recente primeiro, com data_fim só na que foi
// encerrada -- e o recorte de escopo, que responde ErrNaoEncontrado a quem não
// alcança a máquina em vez de uma lista vazia.
func TestHistoricoPreventiva(t *testing.T) {

	ctx := context.Background()
	pool := bancoDeTeste(t)
	svc := NewRepoPreventiva(pool)
	svcUsuario := NewRepoUsuario(pool)

	exec := func(sql string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, sql, args...); err != nil {
			t.Fatalf("erro em %q: %v", sql, err)
		}
	}

	var tenantID, lojaID, setorMaquina, setorOutro, maquinaID, preventivaID int64
	if err := pool.QueryRow(ctx, `INSERT INTO empresa (subdominio, nome) VALUES ('historico', 'Empresa Histórico') RETURNING id`).Scan(&tenantID); err != nil {
		t.Fatalf("erro ao criar empresa: %v", err)
	}
	tecnicoPrev := tecnicoParaPreventiva(t, ctx, pool, tenantID)
	if err := pool.QueryRow(ctx, `INSERT INTO loja (tenant_id, nome) VALUES ($1, 'Loja') RETURNING id`, tenantID).Scan(&lojaID); err != nil {
		t.Fatalf("erro ao criar loja: %v", err)
	}
	for _, s := range []struct {
		nome string
		dest *int64
	}{{"Padaria", &setorMaquina}, {"Açougue", &setorOutro}} {
		if err := pool.QueryRow(ctx, `INSERT INTO setor (tenant_id, loja_id, nome) VALUES ($1, $2, $3) RETURNING id`, tenantID, lojaID, s.nome).Scan(s.dest); err != nil {
			t.Fatalf("erro ao criar setor %s: %v", s.nome, err)
		}
	}
	if err := pool.QueryRow(ctx,
		`INSERT INTO maquina (tenant_id, setor_id, numero_patrimonio, nome, criticidade)
		 VALUES ($1, $2, 'H-001', 'Forno', 'Alta') RETURNING id`, tenantID, setorMaquina).Scan(&maquinaID); err != nil {
		t.Fatalf("erro ao criar máquina: %v", err)
	}
	if err := pool.QueryRow(ctx,
		`INSERT INTO preventiva (tenant_id, maquina_id, descricao, intervalo_dias, proxima_data, ativa, tecnico_id)
		 VALUES ($1, $2, 'Limpeza', 30, CURRENT_DATE - 1, true, $3) RETURNING id`,
		tenantID, maquinaID, tecnicoPrev).Scan(&preventivaID); err != nil {
		t.Fatalf("erro ao criar preventiva: %v", err)
	}

	senha := "senha-forte-123"
	cadastrar := func(nome, email, perfil string, p model.NovoUsuarioPayload) model.Usuario {
		t.Helper()
		p.Nome, p.Email, p.Perfil, p.Senha = nome, email, perfil, senha
		u, err := svcUsuario.CadastrarUsuario(ctx, p, tenantID)
		if err != nil {
			t.Fatalf("erro ao cadastrar %s: %v", perfil, err)
		}
		return u
	}
	admin := cadastrar("Ana", "ana@historico.com", "administrador", model.NovoUsuarioPayload{})
	gestorDaMaquina := cadastrar("Carla", "carla@historico.com", "gestor", model.NovoUsuarioPayload{
		LojasIds: []int64{lojaID}, SetoresIds: []int64{setorMaquina},
	})
	gestorDeOutroSetor := cadastrar("Dora", "dora@historico.com", "gestor", model.NovoUsuarioPayload{
		LojasIds: []int64{lojaID}, SetoresIds: []int64{setorOutro},
	})

	t.Run("preventiva que ainda não venceu tem histórico vazio, não nulo", func(t *testing.T) {
		ciclos, err := svc.HistoricoPreventiva(ctx, tenantID, admin.Id, "administrador", preventivaID)
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		if ciclos == nil || len(ciclos) != 0 {
			t.Fatalf("ciclos = %#v, esperado [] não-nil", ciclos)
		}
	})

	// Dois ciclos pelo job de verdade: o primeiro é encerrado (feito), o
	// segundo fica Aberto (não feito). Volta a proxima_data entre os dois para
	// o job ver a preventiva vencida de novo, e recua o criado_em do primeiro
	// para a ordem não depender de dois now() no mesmo milissegundo.
	if _, err := svc.AbrirSolicitacoesDePreventivasVencidas(ctx); err != nil {
		t.Fatalf("primeiro ciclo: %v", err)
	}
	var primeiraOS int64
	if err := pool.QueryRow(ctx, `SELECT id FROM ordem_servico WHERE tenant_id = $1`, tenantID).Scan(&primeiraOS); err != nil {
		t.Fatalf("erro ao ler a OS do primeiro ciclo: %v", err)
	}
	exec(`UPDATE solicitacao_os SET criado_em = now() - interval '30 days' WHERE tenant_id = $1`, tenantID)
	exec(`UPDATE ordem_servico SET status = 'Concluída', iniciada_em = now() - interval '29 days' WHERE id = $1`, primeiraOS)
	exec(`INSERT INTO os_encerramento (tenant_id, ordem_servico_id, tipo, tipo_defeito, encerrado_por_id, data_fim, defeito_constatado, causa_raiz, solucao)
	      VALUES ($1, $2, 'maquinario', 'Corretiva', $3, now() - interval '29 days', 'Sujeira', 'Uso', 'Limpeza')`, tenantID, primeiraOS, tecnicoPrev)

	exec(`UPDATE preventiva SET proxima_data = CURRENT_DATE - 1 WHERE id = $1`, preventivaID)
	if _, err := svc.AbrirSolicitacoesDePreventivasVencidas(ctx); err != nil {
		t.Fatalf("segundo ciclo: %v", err)
	}

	t.Run("lista os ciclos do mais recente para o mais antigo", func(t *testing.T) {
		ciclos, err := svc.HistoricoPreventiva(ctx, tenantID, admin.Id, "administrador", preventivaID)
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		if len(ciclos) != 2 {
			t.Fatalf("ciclos = %d, esperado 2", len(ciclos))
		}

		recente, antigo := ciclos[0], ciclos[1]
		if antigo.Id != primeiraOS {
			t.Errorf("o último da lista é a OS %d, esperado a do primeiro ciclo (%d)", antigo.Id, primeiraOS)
		}
		if antigo.Status != "Concluída" || antigo.DataFim == nil || antigo.DataInicio == nil {
			t.Errorf("ciclo feito = %+v, esperado Concluída com início e fim", antigo)
		}
		if recente.Status != "Aberta" || recente.DataFim != nil {
			t.Errorf("ciclo pendente = %+v, esperado Aberta sem data de fim", recente)
		}
		if recente.DataAbertura == nil || recente.TecnicoNome == "" {
			t.Errorf("ciclo sem data de abertura ou técnico: %+v", recente)
		}
	})

	t.Run("gestor do setor da máquina vê o histórico", func(t *testing.T) {
		ciclos, err := svc.HistoricoPreventiva(ctx, tenantID, gestorDaMaquina.Id, "gestor", preventivaID)
		if err != nil {
			t.Fatalf("erro: %v", err)
		}
		if len(ciclos) != 2 {
			t.Fatalf("ciclos = %d, esperado 2", len(ciclos))
		}
	})

	t.Run("gestor de outro setor recebe não encontrado, não lista vazia", func(t *testing.T) {
		_, err := svc.HistoricoPreventiva(ctx, tenantID, gestorDeOutroSetor.Id, "gestor", preventivaID)
		if !errors.Is(err, helper.ErrNaoEncontrado) {
			t.Fatalf("erro = %v, esperado ErrNaoEncontrado", err)
		}
	})

	t.Run("preventiva inexistente é não encontrado", func(t *testing.T) {
		_, err := svc.HistoricoPreventiva(ctx, tenantID, admin.Id, "administrador", 999999999)
		if !errors.Is(err, helper.ErrNaoEncontrado) {
			t.Fatalf("erro = %v, esperado ErrNaoEncontrado", err)
		}
	})
}
