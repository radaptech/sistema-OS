package service

import (
	"context"
	"testing"
	"time"

	"github.com/radaptech/sistema-OSm--Back-end/config"
	"github.com/radaptech/sistema-OSm--Back-end/internal/model"
)

// TestCustosDoMes tranca, contra o banco, o card "Custos do mês" do Painel do
// Gestor: a OS de terceiros vai INTEIRA (peça + mão de obra da empresa) para
// terceiros, as dos técnicos se dividem em mão de obra e peças, OS ainda aberta
// não conta, outro mês vem zerado, e o escopo do Gestor recorta pelo setor da
// solicitação. As OS passam pelo caminho real (solicitação -> AbrirOS ->
// Encerrar com custo por tarefa).
func TestCustosDoMes(t *testing.T) {

	ctx := context.Background()
	pool := bancoDeTeste(t)
	svcUsuario := NewRepoUsuario(pool)
	svcSolicitacao := NewRepoSolicitacao(pool)
	svc := NewRepoOrdemServico(pool)

	var tenantID, lojaID, setorA, setorB, tercID int64
	if err := pool.QueryRow(ctx, `INSERT INTO empresa (subdominio, nome) VALUES ('custos-mes', 'Empresa Custos Mês') RETURNING id`).Scan(&tenantID); err != nil {
		t.Fatalf("erro ao criar empresa: %v", err)
	}
	if err := pool.QueryRow(ctx, `INSERT INTO loja (tenant_id, nome) VALUES ($1, 'Loja') RETURNING id`, tenantID).Scan(&lojaID); err != nil {
		t.Fatalf("erro ao criar loja: %v", err)
	}
	for _, s := range []struct {
		nome string
		dest *int64
	}{{"Padaria", &setorA}, {"Açougue", &setorB}} {
		if err := pool.QueryRow(ctx, `INSERT INTO setor (tenant_id, loja_id, nome) VALUES ($1, $2, $3) RETURNING id`, tenantID, lojaID, s.nome).Scan(s.dest); err != nil {
			t.Fatalf("erro ao criar setor: %v", err)
		}
	}
	if err := pool.QueryRow(ctx, `INSERT INTO empresa_terceirizada (tenant_id, nome) VALUES ($1, 'Refrigeração XYZ') RETURNING id`, tenantID).Scan(&tercID); err != nil {
		t.Fatalf("erro ao criar empresa terceirizada: %v", err)
	}

	area, senha := "Elétrica", "senha-forte-123"
	cadastrar := func(nome, email, perfil string, p model.NovoUsuarioPayload) model.Usuario {
		t.Helper()
		p.Nome, p.Email, p.Perfil, p.Senha = nome, email, perfil, senha
		u, err := svcUsuario.CadastrarUsuario(ctx, p, tenantID)
		if err != nil {
			t.Fatalf("erro ao cadastrar %s: %v", perfil, err)
		}
		return u
	}
	admin := cadastrar("Ana", "ana@custos-mes.com", "administrador", model.NovoUsuarioPayload{})
	eder := cadastrar("Eder", "eder@custos-mes.com", "tecnico", model.NovoUsuarioPayload{LojasIds: []int64{lojaID}, Area: &area})
	fabio := cadastrar("Fábio", "fabio@custos-mes.com", "tecnico", model.NovoUsuarioPayload{LojasIds: []int64{lojaID}, Area: &area})
	gestorA := cadastrar("Carla", "carla@custos-mes.com", "gestor", model.NovoUsuarioPayload{LojasIds: []int64{lojaID}, SetoresIds: []int64{setorA}})
	gestorB := cadastrar("Dora", "dora@custos-mes.com", "gestor", model.NovoUsuarioPayload{LojasIds: []int64{lojaID}, SetoresIds: []int64{setorB}})
	solA := cadastrar("Bruno", "bruno@custos-mes.com", "solicitante", model.NovoUsuarioPayload{LojasIds: []int64{lojaID}, SetoresIds: []int64{setorA}})
	solB := cadastrar("Beto", "beto@custos-mes.com", "solicitante", model.NovoUsuarioPayload{LojasIds: []int64{lojaID}, SetoresIds: []int64{setorB}})

	// reparo abre e (se encerrar) encerra um pequeno reparo com uma tarefa de
	// `pecas` + `maoDeObra`. Terceirizar troca o tipo da OS para 'terceiros'.
	reparo := func(solicitante, tecnico model.Usuario, item string, terceirizar, encerrar bool, pecas, maoDeObra float64) {
		t.Helper()
		s, err := svcSolicitacao.CadastrarSolicitacaoReparo(ctx, tenantID, solicitante.Id, model.NovaSolicitacaoReparoPayload{
			Item: item, Descricao: "Reparo de " + item, FotoChave: "tenant/1/foto.jpg", FotoMime: "image/jpeg", FotoTamanho: 1,
		})
		if err != nil {
			t.Fatalf("erro ao criar reparo: %v", err)
		}
		os, err := svcSolicitacao.AbrirOS(ctx, tenantID, admin.Id, "administrador", s.Id, model.AberturaOrdemServicoPayload{Urgencia: "Baixa", TecnicoId: tecnico.Id})
		if err != nil {
			t.Fatalf("erro ao abrir OS do reparo: %v", err)
		}
		if !encerrar {
			return
		}
		if _, err := svc.Iniciar(ctx, tenantID, tecnico.Id, os.Id); err != nil {
			t.Fatalf("erro ao iniciar: %v", err)
		}
		if terceirizar {
			if _, err := svc.AcionarTerceiro(ctx, tenantID, tecnico.Id, os.Id, tercID); err != nil {
				t.Fatalf("erro ao acionar terceiro: %v", err)
			}
		}
		if _, err := svc.Encerrar(ctx, tenantID, tecnico.Id, os.Id, model.EncerramentoOrdemServicoPayload{
			TipoDefeito: "Predial", DefeitoConstatado: "x", CausaRaiz: "y", Solucao: "z",
			Itens: []model.ItemCustoPayload{{Descricao: "Troca", CustoManutencao: pecas, CustoHoraTecnico: ptrFloat(maoDeObra)}},
		}); err != nil {
			t.Fatalf("erro ao encerrar: %v", err)
		}
	}
	reparo(solA, eder, "Lâmpada", false, true, 50, 100)     // Padaria, Eder: 100 de mão de obra + 50 de peça
	reparo(solA, eder, "Câmara fria", true, true, 400, 200) // Padaria, terceiro: fatura de 600
	reparo(solB, fabio, "Torneira", false, true, 10, 30)    // Açougue, Fábio: 30 + 10
	reparo(solB, fabio, "Balcão", false, false, 999, 999)   // ainda aberta: não conta

	mesAtual := time.Now().In(config.Brasilia).Format("2006-01")

	t.Run("administrador vê o tenant inteiro, separado por quem recebeu", func(t *testing.T) {
		custos, err := svc.ObterCustosDoMes(ctx, tenantID, admin.Id, "administrador", mesAtual)
		if err != nil {
			t.Fatalf("erro ao obter custos do mês: %v", err)
		}
		if custos.MaoDeObraTecnicos != 130 || custos.Terceiros != 600 || custos.Pecas != 60 || custos.CustoTotal != 790 {
			t.Errorf("custos = MO %v / terceiros %v / peças %v / total %v, esperado 130 / 600 / 60 / 790",
				custos.MaoDeObraTecnicos, custos.Terceiros, custos.Pecas, custos.CustoTotal)
		}
		if custos.QuantidadeOs != 3 || custos.QuantidadeOsTerceiros != 1 {
			t.Errorf("quantidades = %d OS / %d terceiros, esperado 3 / 1 (a aberta não conta)", custos.QuantidadeOs, custos.QuantidadeOsTerceiros)
		}
		if custos.Mes != mesAtual[5:7]+"/"+mesAtual[0:4] {
			t.Errorf("mes = %q, esperado o rótulo MM/AAAA", custos.Mes)
		}
		if len(custos.PorTecnico) != 2 || custos.PorTecnico[0].TecnicoId != eder.Id || custos.PorTecnico[0].MaoDeObra != 100 ||
			custos.PorTecnico[0].QuantidadeOs != 1 || custos.PorTecnico[1].TecnicoId != fabio.Id || custos.PorTecnico[1].MaoDeObra != 30 {
			t.Errorf("porTecnico = %+v, esperado Eder (R$ 100 em 1 OS -- a de terceiros não é dele) e Fábio (R$ 30)", custos.PorTecnico)
		}
	})

	t.Run("gestor vê só os setores dele", func(t *testing.T) {
		a, err := svc.ObterCustosDoMes(ctx, tenantID, gestorA.Id, "gestor", mesAtual)
		if err != nil {
			t.Fatalf("erro ao obter custos do gestor A: %v", err)
		}
		if a.MaoDeObraTecnicos != 100 || a.Terceiros != 600 || a.Pecas != 50 || len(a.PorTecnico) != 1 || a.PorTecnico[0].TecnicoId != eder.Id {
			t.Errorf("gestor da Padaria = %+v, esperado só a Padaria (MO 100, terceiros 600, peças 50, só o Eder)", a)
		}

		b, err := svc.ObterCustosDoMes(ctx, tenantID, gestorB.Id, "gestor", mesAtual)
		if err != nil {
			t.Fatalf("erro ao obter custos do gestor B: %v", err)
		}
		if b.MaoDeObraTecnicos != 30 || b.Terceiros != 0 || b.Pecas != 10 || len(b.PorTecnico) != 1 || b.PorTecnico[0].TecnicoId != fabio.Id {
			t.Errorf("gestor do Açougue = %+v, esperado só o Açougue (MO 30, peças 10, só o Fábio)", b)
		}
	})

	t.Run("outro mês vem zerado", func(t *testing.T) {
		custos, err := svc.ObterCustosDoMes(ctx, tenantID, admin.Id, "administrador", "2001-01")
		if err != nil {
			t.Fatalf("erro ao obter custos de outro mês: %v", err)
		}
		if custos.CustoTotal != 0 || custos.QuantidadeOs != 0 || custos.PorTecnico == nil || len(custos.PorTecnico) != 0 {
			t.Errorf("janeiro de 2001 = %+v, esperado zerado com porTecnico []", custos)
		}
	})
}
