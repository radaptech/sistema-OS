package model

// ResumoOrdensServicoSetor é uma linha do resumo de GET /ordens-servico/resumo:
// quantas OS há num setor (e a loja dele) para os filtros pedidos. É o que
// monta os cards da navegação Loja -> Setor quando a lista é paginada no
// servidor. AfetamProducao é o selo vermelho (máquina parada).
type ResumoOrdensServicoSetor struct {
	LojaId         int64  `json:"lojaId"`
	LojaNome       string `json:"lojaNome"`
	SetorId        int64  `json:"setorId"`
	SetorNome      string `json:"setorNome"`
	Quantidade     int64  `json:"quantidade"`
	AfetamProducao int64  `json:"afetamProducao"`
}
