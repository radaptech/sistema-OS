package service

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/radaptech/sistema-OSm--Back-end/config"
	"github.com/radaptech/sistema-OSm--Back-end/internal/model"
)

// notificadorFake grava cada chamada em vez de notificar de verdade -- é o
// próprio motivo de NotificadorInterface existir (ver
// SolicitacaoService.Notificador). O channel sincroniza o teste com a
// goroutine (sem isso o assert rodaria antes dela começar) e guarda a ORDEM
// das chamadas: abrir OS da fila avisa duas pessoas. Bufferizado pra que
// teste que não lê as chamadas (maquinaExclusao) não trave a goroutine.
type notificadorFake struct {
	chamadas chan chamadaNotificador
}

// chamadaNotificador é uma chamada recebida: o método diz o evento, e
// destino é o setorId (eventos "gestores do setor") ou o id do usuário
// (eventos de uma pessoa só) -- o mesmo segundo parâmetro da interface.
type chamadaNotificador struct {
	metodo            string
	tenantId, destino int64
	dados             DadosNotificacao
}

func novoNotificadorFake() *notificadorFake {
	return &notificadorFake{chamadas: make(chan chamadaNotificador, 64)}
}

func (n *notificadorFake) registrar(metodo string, tenantId, destino int64, dados DadosNotificacao) error {
	n.chamadas <- chamadaNotificador{metodo: metodo, tenantId: tenantId, destino: destino, dados: dados}
	return nil
}

func (n *notificadorFake) NotificarNovaSolicitacao(_ context.Context, tenantId, setorId int64, dados DadosNotificacao) error {
	return n.registrar("NovaSolicitacao", tenantId, setorId, dados)
}

func (n *notificadorFake) NotificarSolicitacaoAceita(_ context.Context, tenantId, solicitanteId int64, dados DadosNotificacao) error {
	return n.registrar("SolicitacaoAceita", tenantId, solicitanteId, dados)
}

func (n *notificadorFake) NotificarSolicitacaoRejeitada(_ context.Context, tenantId, solicitanteId int64, dados DadosNotificacao) error {
	return n.registrar("SolicitacaoRejeitada", tenantId, solicitanteId, dados)
}

func (n *notificadorFake) NotificarOSAberta(_ context.Context, tenantId, tecnicoId int64, dados DadosNotificacao) error {
	return n.registrar("OSAberta", tenantId, tecnicoId, dados)
}

func (n *notificadorFake) NotificarOSPreventiva(_ context.Context, tenantId, tecnicoId int64, dados DadosNotificacao) error {
	return n.registrar("OSPreventiva", tenantId, tecnicoId, dados)
}

func (n *notificadorFake) NotificarOSConcluida(_ context.Context, tenantId, setorId int64, dados DadosNotificacao) error {
	return n.registrar("OSConcluida", tenantId, setorId, dados)
}

// espera devolve a próxima chamada, conferindo o método.
func (n *notificadorFake) espera(t *testing.T, metodo string) chamadaNotificador {
	t.Helper()
	select {
	case c := <-n.chamadas:
		if c.metodo != metodo {
			t.Fatalf("notificador chamado com %s, esperado %s", c.metodo, metodo)
		}
		return c
	case <-time.After(2 * time.Second):
		t.Fatalf("notificador não foi chamado (%s) a tempo -- a goroutine não disparou?", metodo)
		return chamadaNotificador{}
	}
}

// nenhuma confere que nada mais foi chamado.
func (n *notificadorFake) nenhuma(t *testing.T) {
	t.Helper()
	select {
	case c := <-n.chamadas:
		t.Errorf("notificador chamado com %s, esperado nenhuma chamada", c.metodo)
	case <-time.After(200 * time.Millisecond):
	}
}

// TestSolicitacaoNotificaAoCriar prova o que a tarefa 4 pluga de verdade: as
// duas criações humanas chamam o Notificador com o setor certo e o texto já
// formatado (Alvo com o patrimônio, SolicitanteNome preenchido) -- e fazem
// isso em goroutine, sem atrasar a resposta (o método já retornou quando o
// teste chama espera()).
func TestSolicitacaoNotificaAoCriar(t *testing.T) {

	ctx := context.Background()
	pool := bancoDeTeste(t)
	svcUsuario := NewRepoUsuario(pool)
	svcMaquina := NewRepoMaquinario(pool)
	svc := NewRepoSolicitacao(pool)

	var tenantID, lojaID, setorID int64
	if err := pool.QueryRow(ctx, `INSERT INTO empresa (subdominio, nome) VALUES ('notif-wiring', 'Empresa Notif Wiring') RETURNING id`).Scan(&tenantID); err != nil {
		t.Fatalf("erro ao criar empresa: %v", err)
	}

	tecnicoPrev := tecnicoParaPreventiva(t, ctx, pool, tenantID)
	if err := pool.QueryRow(ctx, `INSERT INTO loja (tenant_id, nome) VALUES ($1, 'Loja A') RETURNING id`, tenantID).Scan(&lojaID); err != nil {
		t.Fatalf("erro ao criar loja: %v", err)
	}
	if err := pool.QueryRow(ctx, `INSERT INTO setor (tenant_id, loja_id, nome) VALUES ($1, $2, 'Padaria') RETURNING id`, tenantID, lojaID).Scan(&setorID); err != nil {
		t.Fatalf("erro ao criar setor: %v", err)
	}

	maquina, err := svcMaquina.CadastrarMaquina(ctx, tenantID, model.MaquinarioInsert{
		SetorID: setorID, Criticidade: "Alta", NumeroPatrimonio: "PAT-77", Nome: "Forno",
		Preventivas: []model.PreventivaPayload{{
			TecnicoId: tecnicoPrev,
			Descricao: "Revisão", IntervaloDias: 30,
			ProximaData: config.NewDataBrPtr(time.Now().AddDate(0, 0, 7)), Ativa: true,
		}},
	})
	if err != nil {
		t.Fatalf("erro ao criar máquina: %v", err)
	}

	solicitante, err := svcUsuario.CadastrarUsuario(ctx, model.NovoUsuarioPayload{
		Nome: "Bruno", Email: "bruno@notif-wiring.com", Perfil: "solicitante", Senha: "senha-forte-123",
		LojasIds: []int64{lojaID}, SetoresIds: []int64{setorID},
	}, tenantID)
	if err != nil {
		t.Fatalf("erro ao criar solicitante: %v", err)
	}

	t.Run("maquinário -- Alvo com patrimônio, solicitante preenchido", func(t *testing.T) {
		fake := novoNotificadorFake()
		svc.Notificador = fake

		sol, err := svc.CadastrarSolicitacaoMaquinario(ctx, tenantID, solicitante.Id, model.NovaSolicitacaoMaquinarioPayload{
			MaquinaId: maquina.Id, Descricao: "Barulho estranho", Impactos: []string{"Afeta Produção"},
			FotoChave: "tenant/x/foto.jpg", FotoMime: "image/jpeg", FotoTamanho: 111,
		})
		if err != nil {
			t.Fatalf("erro ao cadastrar: %v", err)
		}

		c := fake.espera(t, "NovaSolicitacao")

		if c.tenantId != tenantID || c.destino != setorID {
			t.Errorf("tenantId/setorId = %d/%d, esperado %d/%d", c.tenantId, c.destino, tenantID, setorID)
		}
		if c.dados.Alvo != "Forno · PAT-77" {
			t.Errorf("Alvo = %q, esperado %q", c.dados.Alvo, "Forno · PAT-77")
		}
		if c.dados.SolicitanteNome == nil || *c.dados.SolicitanteNome != "Bruno" {
			t.Errorf("SolicitanteNome = %v, esperado Bruno", c.dados.SolicitanteNome)
		}
		if c.dados.LojaNome != "Loja A" || c.dados.SetorNome != "Padaria" {
			t.Errorf("loja/setor = %q/%q", c.dados.LojaNome, c.dados.SetorNome)
		}
		// É o id que vira a url do clique (/painel-gestor?solicitacao=N).
		if c.dados.SolicitacaoId != sol.Id {
			t.Errorf("SolicitacaoId = %d, esperado %d", c.dados.SolicitacaoId, sol.Id)
		}
	})

	t.Run("reparo -- Alvo é o item, sem máquina", func(t *testing.T) {
		fake := novoNotificadorFake()
		svc.Notificador = fake

		_, err := svc.CadastrarSolicitacaoReparo(ctx, tenantID, solicitante.Id, model.NovaSolicitacaoReparoPayload{
			Item: "Lâmpada queimada", Descricao: "Corredor principal",
			FotoChave: "tenant/x/reparo.jpg", FotoMime: "image/jpeg", FotoTamanho: 22,
		})
		if err != nil {
			t.Fatalf("erro ao cadastrar: %v", err)
		}

		c := fake.espera(t, "NovaSolicitacao")

		if c.dados.Alvo != "Lâmpada queimada" {
			t.Errorf("Alvo = %q, esperado o item do reparo", c.dados.Alvo)
		}
		if c.dados.SolicitanteNome == nil || *c.dados.SolicitanteNome != "Bruno" {
			t.Errorf("SolicitanteNome = %v, esperado Bruno", c.dados.SolicitanteNome)
		}
	})

	t.Run("Notificador nil -- não tenta nada, não panica", func(t *testing.T) {
		svc.Notificador = nil

		_, err := svc.CadastrarSolicitacaoReparo(ctx, tenantID, solicitante.Id, model.NovaSolicitacaoReparoPayload{
			Item: "Torneira pingando", Descricao: "Banheiro",
			FotoChave: "tenant/x/reparo2.jpg", FotoMime: "image/jpeg", FotoTamanho: 33,
		})
		if err != nil {
			t.Fatalf("erro ao cadastrar: %v", err)
		}
	})
}

// TestPreventivaNotificaAoAbrirSolicitacao é o mesmo critério, do lado do job:
// abrirSolicitacaoDaPreventiva relê a máquina (a linha da preventiva não
// carrega os nomes) e notifica sem SolicitanteNome -- é o que faz o texto sair
// como preventiva, não como "nova solicitação".
//
// ⚠️ Desde a migration 000008 quem recebe é o TÉCNICO da preventiva, por id, e
// não os gestores do setor: a OS já nasce atribuída a ele, então o Gestor não
// tem ação nenhuma pendente e a mensagem seria ruído diário. É por isso que o
// assert olha tecnicoId e não setorId -- é o que distingue as duas chamadas do
// notificador.
func TestPreventivaNotificaAoAbrirSolicitacao(t *testing.T) {

	ctx := context.Background()
	pool := bancoDeTeste(t)
	svcMaquina := NewRepoMaquinario(pool)
	svc := NewRepoPreventiva(pool)

	var tenantID, lojaID, setorID int64
	if err := pool.QueryRow(ctx, `INSERT INTO empresa (subdominio, nome) VALUES ('notif-job', 'Empresa Notif Job') RETURNING id`).Scan(&tenantID); err != nil {
		t.Fatalf("erro ao criar empresa: %v", err)
	}

	tecnicoPrev := tecnicoParaPreventiva(t, ctx, pool, tenantID)
	if err := pool.QueryRow(ctx, `INSERT INTO loja (tenant_id, nome) VALUES ($1, 'Loja B') RETURNING id`, tenantID).Scan(&lojaID); err != nil {
		t.Fatalf("erro ao criar loja: %v", err)
	}
	if err := pool.QueryRow(ctx, `INSERT INTO setor (tenant_id, loja_id, nome) VALUES ($1, $2, 'Açougue') RETURNING id`, tenantID, lojaID).Scan(&setorID); err != nil {
		t.Fatalf("erro ao criar setor: %v", err)
	}

	maquina, err := svcMaquina.CadastrarMaquina(ctx, tenantID, model.MaquinarioInsert{
		SetorID: setorID, Criticidade: "Alta", NumeroPatrimonio: "PAT-88", Nome: "Câmara Fria",
		Preventivas: []model.PreventivaPayload{{
			TecnicoId: tecnicoPrev,
			// Vencida: ontem.
			Descricao: "Revisão trimestral", IntervaloDias: 30,
			ProximaData: config.NewDataBrPtr(time.Now().AddDate(0, 0, -1)), Ativa: true,
		}},
	})
	if err != nil {
		t.Fatalf("erro ao criar máquina: %v", err)
	}

	fake := novoNotificadorFake()
	svc.Notificador = fake

	criadas, err := svc.AbrirSolicitacoesDePreventivasVencidas(ctx)
	if err != nil {
		t.Fatalf("erro no job: %v", err)
	}
	if criadas != 1 {
		t.Fatalf("criadas = %d, esperado 1 (a preventiva de %q)", criadas, maquina.Nome)
	}

	// OSPreventiva e não NovaSolicitacao: a preventiva não avisa mais o
	// setor inteiro, avisa o técnico por id.
	c := fake.espera(t, "OSPreventiva")

	if c.tenantId != tenantID || c.destino != tecnicoPrev {
		t.Errorf("tenantId/tecnicoId = %d/%d, esperado %d/%d", c.tenantId, c.destino, tenantID, tecnicoPrev)
	}
	if c.dados.Alvo != "Câmara Fria · PAT-88" {
		t.Errorf("Alvo = %q, esperado %q", c.dados.Alvo, "Câmara Fria · PAT-88")
	}
	if c.dados.SolicitanteNome != nil {
		t.Errorf("SolicitanteNome deveria ser nil (origem preventiva, ninguém por trás), veio %v", *c.dados.SolicitanteNome)
	}
	if c.dados.LojaNome != "Loja B" || c.dados.SetorNome != "Açougue" {
		t.Errorf("loja/setor = %q/%q", c.dados.LojaNome, c.dados.SetorNome)
	}

	// A url do clique aponta pra OS (/painel-tecnico?os=N), não pra
	// solicitação: é a OS que o técnico executa.
	var osID int64
	if err := pool.QueryRow(ctx, `SELECT id FROM ordem_servico WHERE tenant_id = $1`, tenantID).Scan(&osID); err != nil {
		t.Fatalf("erro ao ler a OS da preventiva: %v", err)
	}
	if c.dados.OrdemServicoId != osID {
		t.Errorf("OrdemServicoId = %d, esperado %d", c.dados.OrdemServicoId, osID)
	}
}

// TestFluxoNotificaCadaPasso segue um pedido do começo ao fim e confere quem
// é avisado em cada passo: o Gestor quando o pedido chega, o Técnico e o
// Solicitante quando vira OS (nessa ordem), o Gestor de novo quando encerra.
// Iniciar não avisa ninguém -- só o encerramento fala da execução.
func TestFluxoNotificaCadaPasso(t *testing.T) {

	ctx := context.Background()
	pool := bancoDeTeste(t)
	svcUsuario := NewRepoUsuario(pool)
	svcSol := NewRepoSolicitacao(pool)
	svcOS := NewRepoOrdemServico(pool)
	fake := novoNotificadorFake()
	svcSol.Notificador = fake
	svcOS.Notificador = fake

	var tenantID, lojaID, setorID int64
	if err := pool.QueryRow(ctx, `INSERT INTO empresa (subdominio, nome) VALUES ('notif-fluxo', 'Empresa Notif Fluxo') RETURNING id`).Scan(&tenantID); err != nil {
		t.Fatalf("erro ao criar empresa: %v", err)
	}
	if err := pool.QueryRow(ctx, `INSERT INTO loja (tenant_id, nome) VALUES ($1, 'Loja C') RETURNING id`, tenantID).Scan(&lojaID); err != nil {
		t.Fatalf("erro ao criar loja: %v", err)
	}
	if err := pool.QueryRow(ctx, `INSERT INTO setor (tenant_id, loja_id, nome) VALUES ($1, $2, 'Frios') RETURNING id`, tenantID, lojaID).Scan(&setorID); err != nil {
		t.Fatalf("erro ao criar setor: %v", err)
	}

	area := "Elétrica"
	cadastrar := func(nome, perfil string, p model.NovoUsuarioPayload) model.Usuario {
		t.Helper()
		p.Nome, p.Email, p.Perfil, p.Senha = nome, strings.ToLower(nome)+"@notif-fluxo.com", perfil, "senha-forte-123"
		u, err := svcUsuario.CadastrarUsuario(ctx, p, tenantID)
		if err != nil {
			t.Fatalf("erro ao cadastrar %s: %v", perfil, err)
		}
		return u
	}
	gestor := cadastrar("Gabi", "gestor", model.NovoUsuarioPayload{LojasIds: []int64{lojaID}, SetoresIds: []int64{setorID}})
	tecnico := cadastrar("Tito", "tecnico", model.NovoUsuarioPayload{LojasIds: []int64{lojaID}, Area: &area})
	solicitante := cadastrar("Sara", "solicitante", model.NovoUsuarioPayload{LojasIds: []int64{lojaID}, SetoresIds: []int64{setorID}})

	pedir := func(item string) model.SolicitacaoOS {
		t.Helper()
		sol, err := svcSol.CadastrarSolicitacaoReparo(ctx, tenantID, solicitante.Id, model.NovaSolicitacaoReparoPayload{
			Item: item, Descricao: "Parou de funcionar",
			FotoChave: "tenant/x/" + item + ".jpg", FotoMime: "image/jpeg", FotoTamanho: 10,
		})
		if err != nil {
			t.Fatalf("erro ao pedir: %v", err)
		}
		fake.espera(t, "NovaSolicitacao")
		return sol
	}

	t.Run("aceitar avisa o técnico e depois o solicitante", func(t *testing.T) {
		sol := pedir("Balcão refrigerado")

		os, err := svcSol.AbrirOS(ctx, tenantID, gestor.Id, "gestor", sol.Id, model.AberturaOrdemServicoPayload{Urgencia: "Média", TecnicoId: tecnico.Id})
		if err != nil {
			t.Fatalf("erro ao abrir OS: %v", err)
		}

		paraTecnico := fake.espera(t, "OSAberta")
		if paraTecnico.destino != tecnico.Id || paraTecnico.dados.OrdemServicoId != os.Id || paraTecnico.dados.Urgencia != "Média" {
			t.Errorf("aviso ao técnico = %+v", paraTecnico)
		}
		paraSolicitante := fake.espera(t, "SolicitacaoAceita")
		if paraSolicitante.destino != solicitante.Id || paraSolicitante.dados.SolicitacaoId != sol.Id ||
			paraSolicitante.dados.TecnicoNome == nil || *paraSolicitante.dados.TecnicoNome != "Tito" {
			t.Errorf("aviso ao solicitante = %+v", paraSolicitante)
		}

		t.Run("iniciar não avisa ninguém; encerrar avisa os gestores do setor", func(t *testing.T) {
			if _, err := svcOS.Iniciar(ctx, tenantID, tecnico.Id, os.Id); err != nil {
				t.Fatalf("erro ao iniciar: %v", err)
			}
			fake.nenhuma(t)

			if _, err := svcOS.Encerrar(ctx, tenantID, tecnico.Id, os.Id, model.EncerramentoOrdemServicoPayload{
				TipoDefeito: "Corretiva", DefeitoConstatado: "Compressor", CausaRaiz: "Desgaste", Solucao: "Troca",
				Itens: []model.ItemCustoPayload{{Descricao: "Compressor", CustoManutencao: 300}},
			}); err != nil {
				t.Fatalf("erro ao encerrar: %v", err)
			}

			c := fake.espera(t, "OSConcluida")
			if c.destino != setorID || c.dados.OrdemServicoId != os.Id || c.dados.Alvo != "Balcão refrigerado" ||
				c.dados.TecnicoNome == nil || *c.dados.TecnicoNome != "Tito" {
				t.Errorf("aviso de conclusão = %+v", c)
			}
		})
	})

	t.Run("rejeitar avisa o solicitante com o motivo", func(t *testing.T) {
		sol := pedir("Porta da câmara")

		if _, err := svcSol.Rejeitar(ctx, tenantID, gestor.Id, "gestor", sol.Id, "Já tem OS aberta pra isso"); err != nil {
			t.Fatalf("erro ao rejeitar: %v", err)
		}

		c := fake.espera(t, "SolicitacaoRejeitada")
		if c.destino != solicitante.Id || c.dados.SolicitacaoId != sol.Id || c.dados.MotivoRejeicao != "Já tem OS aberta pra isso" {
			t.Errorf("aviso de rejeição = %+v", c)
		}
		fake.nenhuma(t)
	})
}
