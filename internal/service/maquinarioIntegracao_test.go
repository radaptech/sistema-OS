package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/radaptech/sistema-OSm--Back-end/config"

	"github.com/radaptech/sistema-OSm--Back-end/internal/helper"
	"github.com/radaptech/sistema-OSm--Back-end/internal/model"
)

func TestMaquinarioCrud(t *testing.T) {

	ctx := context.Background()
	pool := bancoDeTeste(t)
	svcLoja := NewRepoLojas(pool)
	svcSetor := NewRepoSetor(pool)
	svc := NewRepoMaquinario(pool)

	var tenantID int64
	if err := pool.QueryRow(ctx, `INSERT INTO empresa (subdominio, nome) VALUES ('maquinas', 'Empresa Maquinas') RETURNING id`).Scan(&tenantID); err != nil {
		t.Fatalf("erro ao criar empresa: %v", err)
	}

	tecnicoPrev := tecnicoParaPreventiva(t, ctx, pool, tenantID)

	loja, err := svcLoja.CadastrarLoja(ctx, tenantID, model.NovaLojaPayload{Nome: "Loja A"})
	if err != nil {
		t.Fatalf("erro ao criar loja: %v", err)
	}
	setor, err := svcSetor.CadastrarSetor(ctx, tenantID, model.NovoSetorPayload{Nome: "Padaria", LojaId: loja.Id})
	if err != nil {
		t.Fatalf("erro ao criar setor: %v", err)
	}

	// Toda máquina nasce com pelo menos uma preventiva -- é regra de negócio, e
	// o service recusa a lista vazia.
	novaMaquina := func(patrimonio, nome string) model.MaquinarioInsert {
		return model.MaquinarioInsert{
			SetorID:          setor.Id,
			Criticidade:      "Alta",
			NumeroPatrimonio: patrimonio,
			Nome:             nome,
			Preventivas: []model.PreventivaPayload{{
				TecnicoId:     tecnicoPrev,
				Descricao:     "Trocar filtro",
				IntervaloDias: 30,
				ProximaData:   config.NewDataBrPtr(time.Now().AddDate(0, 0, 7)),
				Ativa:         true,
			}},
		}
	}

	// Localiza pela listagem em vez de confiar no retorno do cadastro: é o que
	// prova que a transação commitou de verdade, e não só que a função montou
	// uma resposta bonita antes do rollback.
	buscarPorPatrimonio := func(t *testing.T, patrimonio string) (model.Maquinario, bool) {
		t.Helper()
		lidas, err := svc.ListarMaquinario(ctx, tenantID, 0, "administrador", nil, nil)
		if err != nil {
			t.Fatalf("erro ao listar: %v", err)
		}
		for _, m := range lidas {
			if m.NumeroPatrimonio == patrimonio {
				return m, true
			}
		}
		return model.Maquinario{}, false
	}

	t.Run("cadastra e a máquina persiste depois da transação", func(t *testing.T) {
		resposta, err := svc.CadastrarMaquina(ctx, tenantID, novaMaquina("P1", "  Forno  "))
		if err != nil {
			t.Fatalf("erro ao cadastrar: %v", err)
		}
		// O front consome POST e GET pelo mesmo tipo Maquina: a resposta da
		// criação já tem que vir com id e nomes resolvidos.
		if resposta.Id == 0 || resposta.SetorNome != "Padaria" || resposta.LojaNome != "Loja A" {
			t.Errorf("resposta do POST incompleta: %+v", resposta)
		}

		criada, ok := buscarPorPatrimonio(t, "P1")
		if !ok {
			t.Fatal("máquina não persistiu -- transação sem commit?")
		}
		if criada.Nome != "Forno" {
			t.Errorf("nome devia vir aparado: %q", criada.Nome)
		}
		// A listagem é a única que traz os nomes: o front tipa setorNome/lojaId
		// como obrigatórios e maquina não guarda loja_id.
		if criada.SetorNome != "Padaria" || criada.LojaId != loja.Id || criada.LojaNome != "Loja A" {
			t.Errorf("nomes denormalizados não vieram: %+v", criada)
		}
	})

	// uq_maquina_patrim é UNIQUE (tenant_id, numero_patrimonio): o INSERT falha
	// com 23505 e precisa chegar no controller como ErrDadoDuplicado (409).
	//
	// Sem checar o erro de CriarMaquina, a transação segue abortada até o
	// tx.Commit, e o que sobe é o ErrTxCommitRollback do pgx ("commit
	// unexpectedly resulted in rollback") -- que não casa com nenhum sentinela,
	// cai no ramo genérico do controller e vira 500. O 23505 já tinha a
	// tradução pronta em TraduzErroPostgres; ele só nunca é consultado.
	t.Run("patrimônio duplicado é dado duplicado, não sucesso silencioso", func(t *testing.T) {
		_, err := svc.CadastrarMaquina(ctx, tenantID, novaMaquina("P1", "Outro Forno"))
		if !errors.Is(err, helper.ErrDadoDuplicado) {
			t.Errorf("esperado ErrDadoDuplicado, veio %v", err)
		}
		if _, ok := buscarPorPatrimonio(t, "P1"); !ok {
			t.Error("a máquina original sumiu")
		}
	})

	// Bug de produção: série repetida com patrimônio inédito respondia
	// "patrimônio duplicado", porque uq_maquina_serie também é 23505.
	t.Run("série duplicada não se passa por patrimônio duplicado", func(t *testing.T) {
		serie := "S-DUP"
		primeira := novaMaquina("PS1", "Batedeira")
		primeira.NumeroSerie = &serie
		if _, err := svc.CadastrarMaquina(ctx, tenantID, primeira); err != nil {
			t.Fatalf("cadastrar a primeira: %v", err)
		}
		segunda := novaMaquina("PS2", "Batedeira 2")
		segunda.NumeroSerie = &serie
		if _, err := svc.CadastrarMaquina(ctx, tenantID, segunda); !errors.Is(err, helper.ErrSerieDuplicada) {
			t.Errorf("esperado ErrSerieDuplicada, veio %v", err)
		}
	})

	t.Run("setor inexistente é conflito, não 500", func(t *testing.T) {
		payload := novaMaquina("P9", "Serra")
		payload.SetorID = setor.Id + 1000
		if _, err := svc.CadastrarMaquina(ctx, tenantID, payload); !errors.Is(err, helper.ErrConflitoIntegridade) {
			t.Errorf("esperado ErrConflitoIntegridade, veio %v", err)
		}
	})

	t.Run("nome vazio é recusado", func(t *testing.T) {
		if _, err := svc.CadastrarMaquina(ctx, tenantID, novaMaquina("P8", "   ")); !errors.Is(err, helper.ErrValidacao) {
			t.Errorf("esperado ErrValidacao, veio %v", err)
		}
	})

	t.Run("atualiza devolvendo a linha com os nomes resolvidos", func(t *testing.T) {
		alvo, ok := buscarPorPatrimonio(t, "P1")
		if !ok {
			t.Fatal("máquina P1 não encontrada")
		}

		atualizada, err := svc.AtualizarMaquina(ctx, tenantID, alvo.Id, model.AtualizarMaquina{
			SetorID:          setor.Id,
			Criticidade:      "Baixa",
			NumeroPatrimonio: "P1",
			Nome:             "Forno Novo",
			Preventivas: []model.PreventivaPayload{{
				TecnicoId:     tecnicoPrev,
				Descricao:     "Lubrificar",
				IntervaloDias: 15,
				ProximaData:   config.NewDataBrPtr(time.Now().AddDate(0, 0, 3)),
				Ativa:         true,
			}},
		})
		if err != nil {
			t.Fatalf("erro ao atualizar: %v", err)
		}
		if atualizada.Id == 0 {
			t.Fatalf("resposta do PUT sem id: %+v", atualizada)
		}
		if atualizada.Nome != "Forno Novo" || atualizada.Criticidade != "Baixa" {
			t.Errorf("atualização não refletiu: %+v", atualizada)
		}
		// Mesma exigência do GET: o front consome os dois pelo tipo Maquina.
		if atualizada.SetorNome != "Padaria" || atualizada.LojaId != loja.Id || atualizada.LojaNome != "Loja A" {
			t.Errorf("PUT devolveu sem os nomes denormalizados: %+v", atualizada)
		}

		relida, err := svc.ObterMaquina(ctx, tenantID, alvo.Id)
		if err != nil {
			t.Fatalf("erro ao reler: %v", err)
		}
		if relida.Nome != "Forno Novo" {
			t.Errorf("atualização não persistiu: %+v", relida)
		}
	})

	// O bug que estes subtestes trancam: editar a máquina desativava todas as
	// preventivas e recriava, e cada "Salvar" dava id novo a elas -- o histórico
	// de ciclos ficava no id antigo. Somado à data de coluna `date` saindo um dia
	// antes, cada edição ainda atrasava a preventiva em um dia.
	preventivasDa := func(t *testing.T, maquinaID int64) map[int64]struct {
		ativa bool
		data  time.Time
	} {
		t.Helper()
		linhas, err := pool.Query(ctx, `SELECT id, ativa, proxima_data FROM preventiva WHERE tenant_id = $1 AND maquina_id = $2`, tenantID, maquinaID)
		if err != nil {
			t.Fatalf("erro ao ler preventivas: %v", err)
		}
		defer linhas.Close()
		lidas := map[int64]struct {
			ativa bool
			data  time.Time
		}{}
		for linhas.Next() {
			var id int64
			var ativa bool
			var data time.Time
			if err := linhas.Scan(&id, &ativa, &data); err != nil {
				t.Fatalf("erro ao ler linha: %v", err)
			}
			lidas[id] = struct {
				ativa bool
				data  time.Time
			}{ativa, data}
		}
		return lidas
	}

	t.Run("editar mantém o id da preventiva que voltou, cria a nova e desativa a removida", func(t *testing.T) {
		payload := novaMaquina("P8", "Masseira")
		payload.Preventivas = append(payload.Preventivas, model.PreventivaPayload{
			TecnicoId: tecnicoPrev, Descricao: "Esticar correia", IntervaloDias: 60,
			ProximaData: config.NewDataBrPtr(time.Date(2026, 10, 17, 0, 0, 0, 0, config.Brasilia)), Ativa: true,
		})
		criada, err := svc.CadastrarMaquina(ctx, tenantID, payload)
		if err != nil {
			t.Fatalf("erro ao cadastrar: %v", err)
		}
		var mantida, removida int64
		if err := pool.QueryRow(ctx, `SELECT id FROM preventiva WHERE maquina_id = $1 AND descricao = 'Esticar correia'`, criada.Id).Scan(&mantida); err != nil {
			t.Fatalf("preventiva mantida não encontrada: %v", err)
		}
		if err := pool.QueryRow(ctx, `SELECT id FROM preventiva WHERE maquina_id = $1 AND descricao = 'Trocar filtro'`, criada.Id).Scan(&removida); err != nil {
			t.Fatalf("preventiva removida não encontrada: %v", err)
		}

		// O que o formulário de edição manda: a que ficou volta com id e com a
		// data que ele LEU da API (NewDataBrDeDate), a removida não vem, e há uma nova.
		lidaDaApi := config.NewDataBrDeDate(pgtype.Date{Time: time.Date(2026, 10, 17, 0, 0, 0, 0, time.UTC), Valid: true})
		_, err = svc.AtualizarMaquina(ctx, tenantID, criada.Id, model.AtualizarMaquina{
			SetorID: setor.Id, Criticidade: "Alta", NumeroPatrimonio: "P8", Nome: "Masseira",
			Preventivas: []model.PreventivaPayload{
				{Id: &mantida, TecnicoId: tecnicoPrev, Descricao: "Esticar correia", IntervaloDias: 60, ProximaData: lidaDaApi, Ativa: true},
				{TecnicoId: tecnicoPrev, Descricao: "Limpar cuba", IntervaloDias: 7, ProximaData: config.NewDataBrPtr(time.Now()), Ativa: true},
			},
		})
		if err != nil {
			t.Fatalf("erro ao atualizar: %v", err)
		}

		depois := preventivasDa(t, criada.Id)
		if len(depois) != 3 {
			t.Fatalf("esperado 3 linhas (mantida, removida, nova), veio %d: %+v", len(depois), depois)
		}
		if !depois[mantida].ativa {
			t.Error("a preventiva que voltou com id foi desativada -- o histórico dela se perde")
		}
		if d := depois[mantida].data; d.Year() != 2026 || d.Month() != 10 || d.Day() != 17 {
			t.Errorf("a data da preventiva mantida andou: %s, esperado 2026-10-17", d.Format("2006-01-02"))
		}
		if depois[removida].ativa {
			t.Error("a preventiva removida do formulário continua ativa")
		}
	})

	t.Run("id de preventiva de outra máquina é recusado e nada muda", func(t *testing.T) {
		outra, err := svc.CadastrarMaquina(ctx, tenantID, novaMaquina("P9", "Cilindro"))
		if err != nil {
			t.Fatalf("erro ao cadastrar: %v", err)
		}
		alvo, err := svc.CadastrarMaquina(ctx, tenantID, novaMaquina("P10", "Divisora"))
		if err != nil {
			t.Fatalf("erro ao cadastrar: %v", err)
		}
		var daOutra int64
		if err := pool.QueryRow(ctx, `SELECT id FROM preventiva WHERE maquina_id = $1`, outra.Id).Scan(&daOutra); err != nil {
			t.Fatalf("erro ao ler preventiva: %v", err)
		}
		antes := preventivasDa(t, alvo.Id)

		_, err = svc.AtualizarMaquina(ctx, tenantID, alvo.Id, model.AtualizarMaquina{
			SetorID: setor.Id, Criticidade: "Alta", NumeroPatrimonio: "P10", Nome: "Divisora",
			Preventivas: []model.PreventivaPayload{{
				Id: &daOutra, TecnicoId: tecnicoPrev, Descricao: "Sequestro", IntervaloDias: 1,
				ProximaData: config.NewDataBrPtr(time.Now()), Ativa: true,
			}},
		})
		if !errors.Is(err, helper.ErrValidacao) {
			t.Fatalf("esperado ErrValidacao, veio %v", err)
		}
		// A desativação roda antes do item recusado: a transação tem que desfazê-la.
		for id, p := range preventivasDa(t, alvo.Id) {
			if p.ativa != antes[id].ativa {
				t.Errorf("preventiva %d mudou apesar do erro -- transação não voltou", id)
			}
		}
		var descricao string
		if err := pool.QueryRow(ctx, `SELECT descricao FROM preventiva WHERE id = $1`, daOutra).Scan(&descricao); err != nil || descricao != "Trocar filtro" {
			t.Errorf("a preventiva da outra máquina foi alterada: %q, %v", descricao, err)
		}
	})

	// O motivo de CadastrarMaquina ser transacional: máquina e preventivas
	// gravam juntas ou nenhuma grava. Sem isso sobraria máquina sem preventiva,
	// que o front nem consegue editar (o formulário exige min(1)).
	t.Run("preventiva inválida desfaz a máquina junto", func(t *testing.T) {
		payload := novaMaquina("P7", "Fritadeira")
		payload.Preventivas[0].IntervaloDias = 0

		if _, err := svc.CadastrarMaquina(ctx, tenantID, payload); !errors.Is(err, helper.ErrValidacao) {
			t.Fatalf("esperado ErrValidacao, veio %v", err)
		}
		if _, ok := buscarPorPatrimonio(t, "P7"); ok {
			t.Error("máquina persistiu apesar da preventiva inválida -- transação não voltou")
		}
	})

	t.Run("máquina sem preventiva é recusada", func(t *testing.T) {
		payload := novaMaquina("P6", "Balança")
		payload.Preventivas = nil

		if _, err := svc.CadastrarMaquina(ctx, tenantID, payload); !errors.Is(err, helper.ErrValidacao) {
			t.Errorf("esperado ErrValidacao, veio %v", err)
		}
	})

	t.Run("id inexistente e de outro tenant são não encontrado", func(t *testing.T) {
		if _, err := svc.ObterMaquina(ctx, tenantID, 9999); !errors.Is(err, helper.ErrNaoEncontrado) {
			t.Errorf("obter inexistente: %v", err)
		}
		if _, err := svc.AtualizarMaquina(ctx, tenantID, 9999, model.AtualizarMaquina{
			SetorID: setor.Id, Criticidade: "Baixa", NumeroPatrimonio: "PX", Nome: "X",
			Preventivas: []model.PreventivaPayload{{
				TecnicoId: tecnicoPrev,
				Descricao: "X", IntervaloDias: 1,
				ProximaData: config.NewDataBrPtr(time.Now()), Ativa: true,
			}},
		}); !errors.Is(err, helper.ErrNaoEncontrado) {
			t.Errorf("atualizar inexistente: %v", err)
		}
		if err := svc.DesativarMaquina(ctx, tenantID, 9999); !errors.Is(err, helper.ErrNaoEncontrado) {
			t.Errorf("desativar inexistente: %v", err)
		}
	})

	t.Run("desativada some da listagem mas ainda é legível por id", func(t *testing.T) {
		if _, err := svc.CadastrarMaquina(ctx, tenantID, novaMaquina("P2", "Batedeira")); err != nil {
			t.Fatalf("erro ao cadastrar: %v", err)
		}
		criada, ok := buscarPorPatrimonio(t, "P2")
		if !ok {
			t.Fatal("máquina P2 não persistiu")
		}

		if err := svc.DesativarMaquina(ctx, tenantID, criada.Id); err != nil {
			t.Fatalf("erro ao desativar: %v", err)
		}

		if _, ok := buscarPorPatrimonio(t, "P2"); ok {
			t.Error("máquina desativada continua na listagem")
		}
		// A tela de edição precisa ler mesmo desativada.
		if _, err := svc.ObterMaquina(ctx, tenantID, criada.Id); err != nil {
			t.Errorf("obter desativada por id: %v", err)
		}
	})
}
