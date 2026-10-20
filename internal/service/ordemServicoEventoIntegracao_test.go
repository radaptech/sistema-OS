package service

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/radaptech/sistema-OSm--Back-end/config"
	"github.com/radaptech/sistema-OSm--Back-end/internal/helper"
	"github.com/radaptech/sistema-OSm--Back-end/internal/model"
)

// TestHistoricoDaOS cobre a linha do tempo (migration 000021) de ponta a ponta:
// cada passo do ciclo de vida grava UM evento com o autor certo, a correção do
// Administrador preserva o lançamento do Técnico, o escopo da leitura é o da
// listagem, e a tabela é append-only.
//
// Falha aqui é silenciosa em produção: o ciclo de vida segue funcionando e só a
// auditoria fica furada. Por isso o teste confere tipo, autor e ordem, não só
// a contagem.
func TestHistoricoDaOS(t *testing.T) {

	ctx := context.Background()
	pool := bancoDeTeste(t)
	svcUsuario := NewRepoUsuario(pool)
	svcMaquina := NewRepoMaquinario(pool)
	svcSolicitacao := NewRepoSolicitacao(pool)
	svcOS := NewRepoOrdemServico(pool)

	var tenantID, lojaID, setorA, setorB, empresaTercID int64
	if err := pool.QueryRow(ctx, `INSERT INTO empresa (subdominio, nome) VALUES ('os-historico', 'Empresa Histórico') RETURNING id`).Scan(&tenantID); err != nil {
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
	if err := pool.QueryRow(ctx, `INSERT INTO empresa_terceirizada (tenant_id, nome) VALUES ($1, 'Refrigeração ABC') RETURNING id`, tenantID).Scan(&empresaTercID); err != nil {
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
	admin := cadastrar("Ana", "ana@os-historico.com", "administrador", model.NovoUsuarioPayload{})
	tecnico := cadastrar("Eder", "eder@os-historico.com", "tecnico", model.NovoUsuarioPayload{LojasIds: []int64{lojaID}, Area: &area})
	tecnicoOutro := cadastrar("Ivo", "ivo@os-historico.com", "tecnico", model.NovoUsuarioPayload{LojasIds: []int64{lojaID}, Area: &area})
	gestorDoSetor := cadastrar("Carla", "carla@os-historico.com", "gestor", model.NovoUsuarioPayload{LojasIds: []int64{lojaID}, SetoresIds: []int64{setorA}})
	gestorOutroSetor := cadastrar("Dora", "dora@os-historico.com", "gestor", model.NovoUsuarioPayload{LojasIds: []int64{lojaID}, SetoresIds: []int64{setorB}})
	solicitante := cadastrar("Bruno", "bruno@os-historico.com", "solicitante", model.NovoUsuarioPayload{LojasIds: []int64{lojaID}, SetoresIds: []int64{setorA}})

	m, err := svcMaquina.CadastrarMaquina(ctx, tenantID, model.MaquinarioInsert{
		SetorID: setorA, Criticidade: "Alta", NumeroPatrimonio: "PAT-HIST", Nome: "Forno",
		Preventivas: []model.PreventivaPayload{{
			TecnicoId: tecnicoPrev, Descricao: "Revisão", IntervaloDias: 30,
			ProximaData: config.NewDataBrPtr(time.Now().AddDate(0, 0, 7)), Ativa: true,
		}},
	})
	if err != nil {
		t.Fatalf("erro ao criar máquina: %v", err)
	}
	sol, err := svcSolicitacao.CadastrarSolicitacaoMaquinario(ctx, tenantID, solicitante.Id, model.NovaSolicitacaoMaquinarioPayload{
		MaquinaId: m.Id, Descricao: "Forno não aquece", Impactos: []string{"Afeta Produção"},
		FotoChave: "tenant/1/foto.jpg", FotoMime: "image/jpeg", FotoTamanho: 1,
	})
	if err != nil {
		t.Fatalf("erro ao criar solicitação: %v", err)
	}
	os, err := svcSolicitacao.AbrirOS(ctx, tenantID, gestorDoSetor.Id, "gestor", sol.Id, model.AberturaOrdemServicoPayload{
		Urgencia: "Alta", TecnicoId: tecnico.Id,
	})
	if err != nil {
		t.Fatalf("erro ao abrir OS: %v", err)
	}

	if os.Origem != "solicitante" {
		t.Errorf("origem da OS aberta pela fila = %q, esperado solicitante", os.Origem)
	}

	passo := func(nome string, f func() error) {
		t.Helper()
		if err := f(); err != nil {
			t.Fatalf("%s: %v", nome, err)
		}
	}
	passo("pausar", func() error { _, e := svcOS.Pausar(ctx, tenantID, tecnico.Id, os.Id, "Aguardando peça"); return e })
	passo("retomar", func() error { _, e := svcOS.Retomar(ctx, tenantID, tecnico.Id, os.Id); return e })
	passo("iniciar", func() error { _, e := svcOS.Iniciar(ctx, tenantID, tecnico.Id, os.Id); return e })
	passo("terceiro", func() error {
		_, e := svcOS.AcionarTerceiro(ctx, tenantID, tecnico.Id, os.Id, empresaTercID)
		return e
	})
	passo("encerrar", func() error {
		_, e := svcOS.Encerrar(ctx, tenantID, tecnico.Id, os.Id, model.EncerramentoOrdemServicoPayload{
			TipoDefeito: "Corretiva", DefeitoConstatado: "Resistência queimada", CausaRaiz: "Desgaste", Solucao: "Troca",
			Itens: itensMaquinario(45, 120.5),
		})
		return e
	})
	passo("corrigir custo", func() error {
		_, e := svcOS.CorrigirCusto(ctx, tenantID, admin.Id, os.Id, model.LancamentoCustoManutencaoPayload{
			Itens: itensMaquinario(60, 200), TemNotaFiscal: true,
			NotasFiscais: []model.NotaFiscalPayload{{Numero: "NF-1", Serie: "3"}},
		})
		return e
	})

	t.Run("cada passo grava um evento, na ordem, com o autor certo", func(t *testing.T) {
		eventos, err := svcOS.ListarHistorico(ctx, tenantID, admin.Id, "administrador", os.Id)
		if err != nil {
			t.Fatalf("erro ao listar: %v", err)
		}

		esperado := []struct {
			tipo, autor string
		}{
			{"aberta", "Carla"}, // quem aprovou, não o técnico nem o solicitante
			{"pausada", "Eder"},
			{"retomada", "Eder"},
			{"iniciada", "Eder"},
			{"terceiro_acionado", "Eder"},
			{"encerrada", "Eder"},
			{"custo_corrigido", "Ana"}, // o Administrador, não quem encerrou
		}
		if len(eventos) != len(esperado) {
			t.Fatalf("%d eventos, esperado %d: %+v", len(eventos), len(esperado), eventos)
		}
		for i, e := range esperado {
			if eventos[i].Tipo != e.tipo {
				t.Errorf("evento %d: tipo = %q, esperado %q", i, eventos[i].Tipo, e.tipo)
			}
			if eventos[i].UsuarioNome == nil || *eventos[i].UsuarioNome != e.autor {
				t.Errorf("evento %d (%s): autor = %v, esperado %s", i, e.tipo, eventos[i].UsuarioNome, e.autor)
			}
			if eventos[i].OcorridoEm == nil {
				t.Errorf("evento %d (%s): ocorridoEm nulo", i, e.tipo)
			}
		}

		// Estados: aberta nasce Aberta; retomar volta ao que a pausa guardou
		// (Aberta, porque a pausa foi dada antes de iniciar).
		if p := eventos[1]; p.StatusAnterior == nil || *p.StatusAnterior != "Aberta" || *p.StatusNovo != "Pausada" {
			t.Errorf("pausada: %v -> %v, esperado Aberta -> Pausada", p.StatusAnterior, p.StatusNovo)
		}
		if r := eventos[2]; r.StatusAnterior == nil || *r.StatusAnterior != "Pausada" || *r.StatusNovo != "Aberta" {
			t.Errorf("retomada: %v -> %v, esperado Pausada -> Aberta", r.StatusAnterior, r.StatusNovo)
		}
		if eventos[4].StatusNovo != nil {
			t.Errorf("terceiro_acionado não muda estado, veio %v", *eventos[4].StatusNovo)
		}
	})

	t.Run("o lançamento do Técnico sobrevive à correção do Administrador", func(t *testing.T) {
		eventos, err := svcOS.ListarHistorico(ctx, tenantID, tecnico.Id, "tecnico", os.Id)
		if err != nil {
			t.Fatalf("erro ao listar: %v", err)
		}

		total := func(e model.EventoOrdemServico) (float64, int) {
			var d struct {
				CustoTotal float64           `json:"custoTotal"`
				Itens      []json.RawMessage `json:"itens"`
			}
			if err := json.Unmarshal(e.Detalhes, &d); err != nil {
				t.Fatalf("detalhes de %s não é JSON de custo: %v (%s)", e.Tipo, err, e.Detalhes)
			}
			return d.CustoTotal, len(d.Itens)
		}

		original, n := total(eventos[5])
		if original != 165.5 || n != 1 {
			t.Errorf("encerrada: custo = %v (%d itens), esperado 165.5 (1 item) -- o que o Técnico digitou", original, n)
		}
		corrigido, _ := total(eventos[6])
		if corrigido != 260 {
			t.Errorf("custo_corrigido: custo = %v, esperado 260", corrigido)
		}

		var d struct {
			Notas []struct{ Numero string } `json:"notasFiscais"`
		}
		_ = json.Unmarshal(eventos[6].Detalhes, &d)
		if len(d.Notas) != 1 || d.Notas[0].Numero != "NF-1" {
			t.Errorf("notas da correção = %+v, esperado NF-1", d.Notas)
		}
	})

	t.Run("pausa guarda o motivo e terceiro guarda o nome da empresa", func(t *testing.T) {
		eventos, _ := svcOS.ListarHistorico(ctx, tenantID, admin.Id, "administrador", os.Id)

		var pausa struct{ Motivo string }
		_ = json.Unmarshal(eventos[1].Detalhes, &pausa)
		if pausa.Motivo != "Aguardando peça" {
			t.Errorf("motivo = %q", pausa.Motivo)
		}
		var terc struct {
			Nome string `json:"empresaTerceirizadaNome"`
		}
		_ = json.Unmarshal(eventos[4].Detalhes, &terc)
		if terc.Nome != "Refrigeração ABC" {
			t.Errorf("empresa = %q", terc.Nome)
		}
	})

	t.Run("escopo da leitura: o da listagem", func(t *testing.T) {
		casos := []struct {
			nome    string
			usuario int64
			perfil  string
			ok      bool
		}{
			{"administrador", admin.Id, "administrador", true},
			{"gestor do setor", gestorDoSetor.Id, "gestor", true},
			{"técnico dono", tecnico.Id, "tecnico", true},
			{"gestor de outro setor", gestorOutroSetor.Id, "gestor", false},
			{"técnico que não é dono", tecnicoOutro.Id, "tecnico", false},
			// O Solicitante acompanha o pedido, não a execução: a rota nem o deixa
			// entrar, e o service também não.
			{"solicitante", solicitante.Id, "solicitante", false},
		}
		for _, c := range casos {
			_, err := svcOS.ListarHistorico(ctx, tenantID, c.usuario, c.perfil, os.Id)
			if c.ok && err != nil {
				t.Errorf("%s: erro inesperado %v", c.nome, err)
			}
			if !c.ok && !errors.Is(err, helper.ErrNaoEncontrado) {
				t.Errorf("%s: erro = %v, esperado ErrNaoEncontrado (404, não confirma que a OS existe)", c.nome, err)
			}
		}
		if _, err := svcOS.ListarHistorico(ctx, tenantID, admin.Id, "administrador", 999999); !errors.Is(err, helper.ErrNaoEncontrado) {
			t.Errorf("OS inexistente: erro = %v, esperado ErrNaoEncontrado", err)
		}
	})

	t.Run("passo recusado não deixa evento", func(t *testing.T) {
		antes, _ := svcOS.ListarHistorico(ctx, tenantID, admin.Id, "administrador", os.Id)
		// A OS já está Concluída: iniciar de novo é recusado.
		if _, err := svcOS.Iniciar(ctx, tenantID, tecnico.Id, os.Id); err == nil {
			t.Fatal("iniciar OS concluída devia falhar")
		}
		depois, _ := svcOS.ListarHistorico(ctx, tenantID, admin.Id, "administrador", os.Id)
		if len(depois) != len(antes) {
			t.Errorf("%d eventos depois da recusa, eram %d", len(depois), len(antes))
		}
	})

	t.Run("a tabela é append-only", func(t *testing.T) {
		if _, err := pool.Exec(ctx, `UPDATE os_evento SET usuario_id = $1 WHERE ordem_servico_id = $2`, admin.Id, os.Id); err == nil {
			t.Error("UPDATE em os_evento devia ser recusado pelo trigger")
		}
	})

	t.Run("só a abertura pode ficar sem autor", func(t *testing.T) {
		_, err := pool.Exec(ctx, `INSERT INTO os_evento (tenant_id, ordem_servico_id, tipo) VALUES ($1, $2, 'iniciada')`, tenantID, os.Id)
		if err == nil {
			t.Error("evento 'iniciada' sem usuário devia violar ck_os_evento_usuario")
		}
	})
}
