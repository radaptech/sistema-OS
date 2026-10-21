package model

import (
	"cmp"
	"slices"

	"github.com/radaptech/sistema-OSm--Back-end/database/repository"
)

// CustosDoMes é o corpo de GET /indicadores/custos -- o card "Custos do mês" do
// Painel do Gestor (tipos/custosDoMes.ts). Tudo o que as OS encerradas no mês
// custaram, separado por quem recebeu o dinheiro:
//
//   - maoDeObraTecnicos: a hora técnica das OS feitas pelos técnicos;
//   - terceiros: a fatura inteira das OS de terceiros (peças + mão de obra da
//     empresa) -- é o "quanto paguei pros terceiros";
//   - pecas: as peças das OS feitas pelos técnicos.
//
// As três somam custoTotal, sem sobreposição: a peça comprada pelo terceiro está
// em terceiros, não em pecas. Mesma regra dos indicadores: float64 não-ponteiro,
// mês sem OS devolve zeros e porTecnico vazio (nunca null -- o front faz .map).
type CustosDoMes struct {
	// Mes é o rótulo MM/AAAA, o mesmo formato do porMes dos indicadores.
	Mes               string  `json:"mes"`
	CustoTotal        float64 `json:"custoTotal"`
	MaoDeObraTecnicos float64 `json:"maoDeObraTecnicos"`
	Terceiros         float64 `json:"terceiros"`
	Pecas             float64 `json:"pecas"`
	// QuantidadeOs é toda OS encerrada no mês; QuantidadeOsTerceiros, quantas
	// delas foram de terceiros (o "em N OS" da linha de terceiros).
	QuantidadeOs          int                 `json:"quantidadeOs"`
	QuantidadeOsTerceiros int                 `json:"quantidadeOsTerceiros"`
	PorTecnico            []CustoTecnicoDoMes `json:"porTecnico"`
}

// CustoTecnicoDoMes é uma linha da lista por técnico: só as OS que ele mesmo
// fez. A OS que ele encaminhou a terceiros não entra aqui -- quem trabalhou e
// cobrou foi a empresa --, nem nas horas dele.
type CustoTecnicoDoMes struct {
	TecnicoId        int64   `json:"tecnicoId"`
	TecnicoNome      string  `json:"tecnicoNome"`
	QuantidadeOs     int     `json:"quantidadeOs"`
	HorasTrabalhadas float64 `json:"horasTrabalhadas"`
	MaoDeObra        float64 `json:"maoDeObra"`
}

// MontarCustosDoMes soma as OS encerradas no mês (ListarCustosDoMes) nas três
// parcelas do card e na lista por técnico, que sai do mais caro para o mais
// barato -- é a pergunta que o card responde. `mes` já vem como MM/AAAA.
func MontarCustosDoMes(mes string, linhas []repository.ListarCustosDoMesRow) CustosDoMes {

	custos := CustosDoMes{Mes: mes, QuantidadeOs: len(linhas)}

	porTecnico := make(map[int64]*CustoTecnicoDoMes)
	for _, os := range linhas {
		if os.Tipo == repository.TipoOsTerceiros {
			custos.QuantidadeOsTerceiros++
			custos.Terceiros += zeroSeNulo(os.CustoManutencao) + zeroSeNulo(os.CustoHoraTecnico)
			continue
		}

		maoDeObra := zeroSeNulo(os.CustoHoraTecnico)
		custos.MaoDeObraTecnicos += maoDeObra
		custos.Pecas += zeroSeNulo(os.CustoManutencao)

		tecnico, ok := porTecnico[os.TecnicoID]
		if !ok {
			tecnico = &CustoTecnicoDoMes{TecnicoId: os.TecnicoID, TecnicoNome: os.TecnicoNome}
			porTecnico[os.TecnicoID] = tecnico
		}
		tecnico.QuantidadeOs++
		tecnico.HorasTrabalhadas += zeroSeNulo(os.HorasTrabalhadas)
		tecnico.MaoDeObra += maoDeObra
	}

	custos.MaoDeObraTecnicos = arredondar(custos.MaoDeObraTecnicos)
	custos.Terceiros = arredondar(custos.Terceiros)
	custos.Pecas = arredondar(custos.Pecas)
	custos.CustoTotal = arredondar(custos.MaoDeObraTecnicos + custos.Terceiros + custos.Pecas)

	custos.PorTecnico = make([]CustoTecnicoDoMes, 0, len(porTecnico))
	for _, tecnico := range porTecnico {
		tecnico.HorasTrabalhadas = arredondar(tecnico.HorasTrabalhadas)
		tecnico.MaoDeObra = arredondar(tecnico.MaoDeObra)
		custos.PorTecnico = append(custos.PorTecnico, *tecnico)
	}
	slices.SortFunc(custos.PorTecnico, func(a, b CustoTecnicoDoMes) int {
		return cmp.Or(
			cmp.Compare(b.MaoDeObra, a.MaoDeObra),
			cmp.Compare(a.TecnicoNome, b.TecnicoNome),
			cmp.Compare(a.TecnicoId, b.TecnicoId),
		)
	})

	return custos
}
