package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/radaptech/sistema-OSm--Back-end/config"
	"github.com/radaptech/sistema-OSm--Back-end/internal/helper"
	"github.com/radaptech/sistema-OSm--Back-end/internal/model"
)

// TestIndicadoresDaLojaSeparamOCustoDosReparos tranca, contra o banco, que o
// pequeno reparo (sem máquina) aparece no painel da loja em campos PRÓPRIOS --
// custoReparos/quantidadeReparos --, nunca somado ao custoTotal do maquinário,
// e que o escopo do Gestor vale para ele. O reparo passa pelo caminho real
// (solicitação -> AbrirOS -> Encerrar com custo por tarefa), inclusive quando o
// Técnico o promove a 'terceiros': continua sendo reparo.
func TestIndicadoresDaLojaSeparamOCustoDosReparos(t *testing.T) {

	ctx := context.Background()
	pool := bancoDeTeste(t)
	svcUsuario := NewRepoUsuario(pool)
	svcMaquina := NewRepoMaquinario(pool)
	svcSolicitacao := NewRepoSolicitacao(pool)
	svc := NewRepoOrdemServico(pool)

	var tenantID, lojaID, setorA, setorB, tercID int64
	if err := pool.QueryRow(ctx, `INSERT INTO empresa (subdominio, nome) VALUES ('ind-rep', 'Empresa Ind Rep') RETURNING id`).Scan(&tenantID); err != nil {
		t.Fatalf("erro ao criar empresa: %v", err)
	}
	tecnicoPrev := tecnicoParaPreventiva(t, ctx, pool, tenantID)
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
	if err := pool.QueryRow(ctx, `INSERT INTO empresa_terceirizada (tenant_id, nome) VALUES ($1, 'Eletricista ABC') RETURNING id`, tenantID).Scan(&tercID); err != nil {
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
	admin := cadastrar("Ana", "ana@ind-rep.com", "administrador", model.NovoUsuarioPayload{})
	tecnico := cadastrar("Eder", "eder@ind-rep.com", "tecnico", model.NovoUsuarioPayload{LojasIds: []int64{lojaID}, Area: &area})
	gestorA := cadastrar("Carla", "carla@ind-rep.com", "gestor", model.NovoUsuarioPayload{LojasIds: []int64{lojaID}, SetoresIds: []int64{setorA}})
	gestorB := cadastrar("Dora", "dora@ind-rep.com", "gestor", model.NovoUsuarioPayload{LojasIds: []int64{lojaID}, SetoresIds: []int64{setorB}})
	solA := cadastrar("Bruno", "bruno@ind-rep.com", "solicitante", model.NovoUsuarioPayload{LojasIds: []int64{lojaID}, SetoresIds: []int64{setorA}})

	// Maquinário da Padaria, com 100 de custo.
	m, err := svcMaquina.CadastrarMaquina(ctx, tenantID, model.MaquinarioInsert{
		SetorID: setorA, Criticidade: "Alta", NumeroPatrimonio: "P-1", Nome: "Forno",
		Preventivas: []model.PreventivaPayload{{TecnicoId: tecnicoPrev, Descricao: "Revisão", IntervaloDias: 30, ProximaData: config.NewDataBrPtr(time.Now().AddDate(0, 0, 7)), Ativa: true}},
	})
	if err != nil {
		t.Fatalf("erro ao criar máquina: %v", err)
	}
	solMaq, err := svcSolicitacao.CadastrarSolicitacaoMaquinario(ctx, tenantID, solA.Id, model.NovaSolicitacaoMaquinarioPayload{
		MaquinaId: m.Id, Descricao: "Forno quebrado", Impactos: []string{"Afeta Produção"},
		FotoChave: "tenant/1/foto.jpg", FotoMime: "image/jpeg", FotoTamanho: 1,
	})
	if err != nil {
		t.Fatalf("erro ao criar solicitação: %v", err)
	}
	osMaq, err := svcSolicitacao.AbrirOS(ctx, tenantID, admin.Id, "administrador", solMaq.Id, model.AberturaOrdemServicoPayload{Urgencia: "Alta", TecnicoId: tecnico.Id})
	if err != nil {
		t.Fatalf("erro ao abrir OS: %v", err)
	}

	// Dois reparos na Padaria (um deles terceirizado no meio) -- 60 e 40.
	reparo := func(item string, terceirizar bool, custo float64) {
		t.Helper()
		s, err := svcSolicitacao.CadastrarSolicitacaoReparo(ctx, tenantID, solA.Id, model.NovaSolicitacaoReparoPayload{
			Item: item, Descricao: "Reparo de " + item, FotoChave: "tenant/1/foto.jpg", FotoMime: "image/jpeg", FotoTamanho: 1,
		})
		if err != nil {
			t.Fatalf("erro ao criar reparo: %v", err)
		}
		os, err := svcSolicitacao.AbrirOS(ctx, tenantID, admin.Id, "administrador", s.Id, model.AberturaOrdemServicoPayload{Urgencia: "Baixa", TecnicoId: tecnico.Id})
		if err != nil {
			t.Fatalf("erro ao abrir OS do reparo: %v", err)
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
			TipoDefeito: "Predial", DefeitoConstatado: "x", CausaRaiz: "y", Solucao: "z", Itens: itensSemHoraTecnica(custo),
		}); err != nil {
			t.Fatalf("erro ao encerrar: %v", err)
		}
	}
	reparo("Lâmpada", false, 60)
	reparo("Torneira", true, 40)

	if _, err := svc.Iniciar(ctx, tenantID, tecnico.Id, osMaq.Id); err != nil {
		t.Fatalf("erro ao iniciar: %v", err)
	}
	if _, err := svc.Encerrar(ctx, tenantID, tecnico.Id, osMaq.Id, model.EncerramentoOrdemServicoPayload{
		TipoDefeito: "Corretiva", DefeitoConstatado: "x", CausaRaiz: "y", Solucao: "z", Itens: itensSemHoraTecnica(100),
	}); err != nil {
		t.Fatalf("erro ao encerrar: %v", err)
	}

	t.Run("custo do maquinário e dos reparos saem separados", func(t *testing.T) {
		loja, err := svc.ObterIndicadoresDaLoja(ctx, tenantID, lojaID, admin.Id, "administrador")
		if err != nil {
			t.Fatalf("erro ao obter indicadores da loja: %v", err)
		}
		if loja.CustoTotal != 100 || loja.QuantidadeOs != 1 {
			t.Errorf("maquinário = R$ %v em %d OS, esperado R$ 100 em 1 -- o reparo não pode entrar aqui", loja.CustoTotal, loja.QuantidadeOs)
		}
		if loja.CustoReparos != 100 || loja.QuantidadeReparos != 2 {
			t.Errorf("reparos = R$ %v em %d OS, esperado R$ 100 em 2 (60 + 40, o terceirizado incluso)", loja.CustoReparos, loja.QuantidadeReparos)
		}
		// O reparo não tem máquina: nenhum card de máquina o recebe.
		for _, mq := range loja.PorMaquina {
			if mq.CustoReparos != 0 || mq.QuantidadeReparos != 0 {
				t.Errorf("máquina %d recebeu reparo: %+v", mq.MaquinaId, mq.ResumoIndicadores)
			}
		}
		// A Padaria carrega os dois; o Açougue (sem máquina e sem reparo) não aparece.
		if len(loja.PorSetor) != 1 || loja.PorSetor[0].CustoTotal != 100 || loja.PorSetor[0].CustoReparos != 100 {
			t.Errorf("porSetor = %+v", loja.PorSetor)
		}
		// Um único mês (hoje), com os dois custos lado a lado.
		if len(loja.PorMes) != 1 || loja.PorMes[0].CustoTotal != 100 || loja.PorMes[0].CustoReparos != 100 {
			t.Errorf("porMes = %+v", loja.PorMes)
		}
	})

	t.Run("a lista dos reparos bate com o número do card", func(t *testing.T) {
		loja, err := svc.ObterIndicadoresDaLoja(ctx, tenantID, lojaID, admin.Id, "administrador")
		if err != nil {
			t.Fatalf("erro ao obter indicadores da loja: %v", err)
		}

		lista, err := svc.ListarOrdensDoPainelDaLoja(ctx, tenantID, lojaID, admin.Id, "administrador", model.GrupoReparos, FiltrosOrdensDoPainel{}, 1)
		if err != nil {
			t.Fatalf("erro ao listar reparos: %v", err)
		}
		if lista.Total != int64(loja.QuantidadeReparos) || len(lista.Dados) != loja.QuantidadeReparos {
			t.Fatalf("lista tem %d (total %d), o card diz %d", len(lista.Dados), lista.Total, loja.QuantidadeReparos)
		}
		var soma float64
		itens := map[string]bool{}
		for _, r := range lista.Dados {
			soma += r.CustoTotal
			itens[r.Item] = true
			if r.SetorNome != "Padaria" || r.TecnicoNome != "Eder" || r.EncerradaEm == nil {
				t.Errorf("reparo %d com dados errados: %+v", r.Id, r)
			}
		}
		if soma != loja.CustoReparos {
			t.Errorf("a soma dos itens é R$ %v, o card diz R$ %v", soma, loja.CustoReparos)
		}
		// O terceirizado (Torneira) continua sendo reparo e está na lista.
		if !itens["Lâmpada"] || !itens["Torneira"] {
			t.Errorf("itens = %v, esperado Lâmpada e Torneira (a terceirizada inclusive)", itens)
		}
	})

	t.Run("a lista respeita os recortes de setor e mês", func(t *testing.T) {
		mesAtual := time.Now().Format("2006-01")
		no := func(setor *int64, mes *string) int {
			t.Helper()
			l, err := svc.ListarOrdensDoPainelDaLoja(ctx, tenantID, lojaID, admin.Id, "administrador", model.GrupoReparos, FiltrosOrdensDoPainel{SetorId: setor, Mes: mes}, 1)
			if err != nil {
				t.Fatalf("erro ao listar: %v", err)
			}
			return len(l.Dados)
		}
		passado := "2020-01"
		if n := no(&setorA, &mesAtual); n != 2 {
			t.Errorf("Padaria no mês atual: %d, esperado 2", n)
		}
		if n := no(&setorB, nil); n != 0 {
			t.Errorf("Açougue: %d, esperado 0 (os reparos são da Padaria)", n)
		}
		if n := no(nil, &passado); n != 0 {
			t.Errorf("mês passado: %d, esperado 0", n)
		}
	})

	t.Run("loja fora do escopo é 404", func(t *testing.T) {
		var outraLoja int64
		if err := pool.QueryRow(ctx, `INSERT INTO loja (tenant_id, nome) VALUES ($1, 'Outra') RETURNING id`, tenantID).Scan(&outraLoja); err != nil {
			t.Fatalf("erro ao criar loja: %v", err)
		}
		if _, err := svc.ListarOrdensDoPainelDaLoja(ctx, tenantID, outraLoja, gestorA.Id, "gestor", model.GrupoReparos, FiltrosOrdensDoPainel{}, 1); !errors.Is(err, helper.ErrNaoEncontrado) {
			t.Errorf("erro = %v, esperado ErrNaoEncontrado", err)
		}
		if _, err := svc.ListarOrdensDoPainelDaLoja(ctx, tenantID, 999999, admin.Id, "administrador", model.GrupoReparos, FiltrosOrdensDoPainel{}, 1); !errors.Is(err, helper.ErrNaoEncontrado) {
			t.Errorf("loja inexistente: erro = %v, esperado ErrNaoEncontrado", err)
		}
	})

	t.Run("o escopo do Gestor vale para o reparo", func(t *testing.T) {
		a, err := svc.ObterIndicadoresDaLoja(ctx, tenantID, lojaID, gestorA.Id, "gestor")
		if err != nil || a.CustoReparos != 100 || a.QuantidadeReparos != 2 {
			t.Errorf("gestor da Padaria: %v reparos em R$ %v, esperado 2 em R$ 100 (err %v)", a.QuantidadeReparos, a.CustoReparos, err)
		}
		b, err := svc.ObterIndicadoresDaLoja(ctx, tenantID, lojaID, gestorB.Id, "gestor")
		if err != nil || b.CustoReparos != 0 || b.QuantidadeReparos != 0 || b.CustoTotal != 0 {
			t.Errorf("gestor do Açougue: %+v (err %v), esperado tudo zero -- não vê o reparo do setor alheio", b.ResumoIndicadores, err)
		}
		// A lista tem o mesmo escopo do card.
		lb, err := svc.ListarOrdensDoPainelDaLoja(ctx, tenantID, lojaID, gestorB.Id, "gestor", model.GrupoReparos, FiltrosOrdensDoPainel{}, 1)
		if err != nil || lb.Total != 0 || len(lb.Dados) != 0 {
			t.Errorf("lista do gestor do Açougue: total %d (err %v), esperado 0", lb.Total, err)
		}
		la, err := svc.ListarOrdensDoPainelDaLoja(ctx, tenantID, lojaID, gestorA.Id, "gestor", model.GrupoReparos, FiltrosOrdensDoPainel{}, 1)
		if err != nil || la.Total != 2 {
			t.Errorf("lista do gestor da Padaria: total %d (err %v), esperado 2", la.Total, err)
		}
	})
}
