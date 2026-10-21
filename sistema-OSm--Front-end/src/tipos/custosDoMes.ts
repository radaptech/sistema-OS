// Corpo de GET /indicadores/custos?mes=MM/AAAA — o card "Custos do mês" do Painel do Gestor
// (model/custosDoMes.go no back). Tudo o que as OS encerradas no mês custaram, separado por
// quem recebeu o dinheiro. As três parcelas somam `custoTotal` sem sobreposição: a peça
// comprada pelo terceiro está em `terceiros`, não em `pecas`.
export interface CustosDoMes {
  // Rótulo MM/AAAA, o mesmo do `porMes` dos indicadores.
  mes: string
  custoTotal: number
  // A hora técnica das OS feitas pelos técnicos.
  maoDeObraTecnicos: number
  // A fatura inteira das OS de terceiros: peças + mão de obra da empresa.
  terceiros: number
  // As peças das OS feitas pelos técnicos.
  pecas: number
  quantidadeOs: number
  quantidadeOsTerceiros: number
  // Do mais caro para o mais barato. Só as OS que o técnico fez — a encaminhada a terceiros
  // é da empresa, e nem as horas dela contam para ele.
  porTecnico: CustoTecnicoDoMes[]
}

export interface CustoTecnicoDoMes {
  tecnicoId: number
  tecnicoNome: string
  quantidadeOs: number
  horasTrabalhadas: number
  maoDeObra: number
}
