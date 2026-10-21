package config

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

// O bug que este teste tranca: o pgx decodifica timestamptz no fuso LOCAL do
// processo, e container sem TZ é UTC. Uma OS aberta às 21:56 de 31/08 saía como
// "01/09/2026 00:56" no painel -- três horas no futuro e um dia à frente.
func TestDataBrSerializaEmBrasiliaMesmoRecebendoUTC(t *testing.T) {

	// Exatamente o que o pgx entregaria num container sem TZ para a linha que o
	// banco guarda como 2026-08-31 21:56:51-03.
	doPgx := time.Date(2026, 9, 1, 0, 56, 51, 0, time.UTC)

	bruto, err := json.Marshal(NewDataBrPtr(doPgx))
	if err != nil {
		t.Fatalf("erro ao serializar: %v", err)
	}

	if string(bruto) != `"31/08/2026 21:56:51"` {
		t.Errorf("data = %s, esperado \"31/08/2026 21:56:51\"", bruto)
	}
}

// A ida tem que assumir o mesmo fuso da volta: com time.Parse (que assume UTC)
// o texto de 21:56 virava 18:56 de Brasília, e o round trip não fechava.
func TestDataBrRoundTrip(t *testing.T) {

	casos := []string{`"31/08/2026 21:56:51"`, `"01/01/2026 00:00:00"`}

	for _, caso := range casos {
		var d DataBr
		if err := d.UnmarshalJSON([]byte(caso)); err != nil {
			t.Fatalf("erro ao desserializar %s: %v", caso, err)
		}
		bruto, err := d.MarshalJSON()
		if err != nil {
			t.Fatalf("erro ao serializar %s: %v", caso, err)
		}
		if string(bruto) != caso {
			t.Errorf("round trip de %s devolveu %s", caso, bruto)
		}
	}
}

// Coluna `date` chega sem hora (preventiva.proxima_data). O dia não pode
// escorregar: parseado em UTC e formatado em Brasília, 01/09 virava 31/08.
func TestDataBrSemHoraMantemODia(t *testing.T) {

	var d DataBr
	if err := d.UnmarshalJSON([]byte(`"01/09/2026"`)); err != nil {
		t.Fatalf("erro ao desserializar: %v", err)
	}

	bruto, err := d.MarshalJSON()
	if err != nil {
		t.Fatalf("erro ao serializar: %v", err)
	}
	if string(bruto) != `"01/09/2026 00:00:00"` {
		t.Errorf("data = %s, esperado \"01/09/2026 00:00:00\"", bruto)
	}
}

// Coluna `date` não é instante: o pgx entrega meia-noite UTC, e converter isso para
// Brasília dava o dia anterior ("16/10/2026 21:00:00" para uma preventiva de 17/10).
func TestNewDataBrDeDateMantemODiaDoBanco(t *testing.T) {

	doPgx := pgtype.Date{Time: time.Date(2026, 10, 17, 0, 0, 0, 0, time.UTC), Valid: true}

	bruto, err := json.Marshal(NewDataBrDeDate(doPgx))
	if err != nil {
		t.Fatalf("erro ao serializar: %v", err)
	}
	if string(bruto) != `"17/10/2026 00:00:00"` {
		t.Errorf("data = %s, esperado \"17/10/2026 00:00:00\"", bruto)
	}

	if NewDataBrDeDate(pgtype.Date{}) != nil {
		t.Error("date nula deveria virar nil")
	}
}

// O que fazia a preventiva andar para trás: o formulário regrava a data que leu. Ler,
// mandar de volta e ler de novo tem que dar o mesmo dia.
func TestNewDataBrDeDateIdaEVoltaNaoMudaODia(t *testing.T) {

	lida := NewDataBrDeDate(pgtype.Date{Time: time.Date(2026, 10, 17, 0, 0, 0, 0, time.UTC), Valid: true})
	bruto, _ := json.Marshal(lida)

	var devolvida DataBr
	if err := devolvida.UnmarshalJSON(bruto); err != nil {
		t.Fatalf("erro ao desserializar %s: %v", bruto, err)
	}
	// É o que preventivaService grava: pgtype.Date com o time que veio do cliente.
	regravada := pgtype.Date{Time: devolvida.Time(), Valid: true}

	if ano, mes, dia := regravada.Time.Date(); ano != 2026 || mes != 10 || dia != 17 {
		t.Errorf("regravada = %04d-%02d-%02d, esperado 2026-10-17", ano, mes, dia)
	}
}
