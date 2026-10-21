package model

import (
	"testing"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/radaptech/sistema-OSm--Back-end/database/repository"
)

// osDoMes monta uma linha de ListarCustosDoMes. f8/nulo vêm dos outros testes
// do pacote.
func osDoMes(tecnicoId int64, nome string, tipo repository.TipoOs, horas, maoDeObra, pecas pgtype.Float8) repository.ListarCustosDoMesRow {
	return repository.ListarCustosDoMesRow{
		TecnicoID:        tecnicoId,
		TecnicoNome:      nome,
		Tipo:             tipo,
		HorasTrabalhadas: horas,
		CustoHoraTecnico: maoDeObra,
		CustoManutencao:  pecas,
	}
}

// Mês sem OS: zeros e porTecnico vazio, nunca nil -- o front faz .map.
func TestCustosDoMesSemOS(t *testing.T) {

	custos := MontarCustosDoMes("10/2026", nil)

	if custos.Mes != "10/2026" || custos.CustoTotal != 0 || custos.QuantidadeOs != 0 {
		t.Errorf("esperado mês zerado, veio %+v", custos)
	}
	if custos.PorTecnico == nil {
		t.Error("porTecnico nil; o front faz .map e quebra")
	}
}

// As três parcelas somam o total sem sobreposição: a fatura inteira do terceiro
// (peça + mão de obra dele) fica em terceiros, e a peça das OS dos técnicos em
// pecas. O técnico só leva as OS que ele mesmo fez.
func TestCustosDoMesSeparaPorQuemRecebeu(t *testing.T) {

	maq, rep, terc := repository.TipoOsMaquinario, repository.TipoOsReparo, repository.TipoOsTerceiros
	custos := MontarCustosDoMes("10/2026", []repository.ListarCustosDoMesRow{
		osDoMes(1, "Eder", maq, f8(2), f8(100), f8(50)),
		osDoMes(1, "Eder", rep, f8(0.5), nulo(), f8(10.10)), // reparo antigo, sem mão de obra
		osDoMes(2, "Ana", maq, f8(3), f8(300), f8(0)),
		osDoMes(1, "Eder", terc, f8(1), f8(200), f8(400)), // a empresa cobrou 600
		osDoMes(3, "Bia", terc, nulo(), nulo(), f8(80)),   // só terceiros: Bia não vira linha
	})

	if custos.MaoDeObraTecnicos != 400 {
		t.Errorf("mão de obra dos técnicos = %v, esperado 400 (100 + 300; a do terceiro não entra)", custos.MaoDeObraTecnicos)
	}
	if custos.Terceiros != 680 {
		t.Errorf("terceiros = %v, esperado 680 (600 + 80, peça E mão de obra da empresa)", custos.Terceiros)
	}
	if custos.Pecas != 60.10 {
		t.Errorf("peças = %v, esperado 60.10 (só das OS dos técnicos)", custos.Pecas)
	}
	if custos.CustoTotal != 1140.10 {
		t.Errorf("total = %v, esperado 1140.10 (a soma das três)", custos.CustoTotal)
	}
	if custos.QuantidadeOs != 5 || custos.QuantidadeOsTerceiros != 2 {
		t.Errorf("quantidades = %d OS / %d terceiros, esperado 5 / 2", custos.QuantidadeOs, custos.QuantidadeOsTerceiros)
	}

	// Mais caro primeiro: Ana (300) antes de Eder (100).
	if len(custos.PorTecnico) != 2 {
		t.Fatalf("porTecnico = %+v, esperado Ana e Eder (Bia só teve terceiros)", custos.PorTecnico)
	}
	ana, eder := custos.PorTecnico[0], custos.PorTecnico[1]
	if ana.TecnicoNome != "Ana" || ana.MaoDeObra != 300 || ana.QuantidadeOs != 1 || ana.HorasTrabalhadas != 3 {
		t.Errorf("Ana = %+v", ana)
	}
	if eder.TecnicoNome != "Eder" || eder.MaoDeObra != 100 || eder.QuantidadeOs != 2 || eder.HorasTrabalhadas != 2.5 {
		t.Errorf("Eder = %+v, esperado 2 OS / 2,5 h / R$ 100 (a OS de terceiros não é dele)", eder)
	}
}

// Empate na mão de obra desempata pelo nome: a lista não pode trocar de ordem a
// cada request (o mapa do Go não tem ordem).
func TestCustosDoMesEmpateOrdenaPorNome(t *testing.T) {

	maq := repository.TipoOsMaquinario
	custos := MontarCustosDoMes("10/2026", []repository.ListarCustosDoMesRow{
		osDoMes(7, "Zeca", maq, f8(1), f8(0), f8(0)),
		osDoMes(8, "Abel", maq, f8(1), f8(0), f8(0)),
	})

	if custos.PorTecnico[0].TecnicoNome != "Abel" || custos.PorTecnico[1].TecnicoNome != "Zeca" {
		t.Errorf("ordem = %s, %s; esperado Abel, Zeca", custos.PorTecnico[0].TecnicoNome, custos.PorTecnico[1].TecnicoNome)
	}
}
