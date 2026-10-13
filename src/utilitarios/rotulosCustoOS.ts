// Cada tarefa de custo tem dois valores — as peças e a mão de obra (`custoManutencao` e
// `custoHoraTecnico` no contrato). Desde a migration 000017 do back todo tipo de OS lança
// os dois com o mesmo nome; em terceiros a mão de obra é da EMPRESA externa (000016).
// Os rótulos moram aqui para encerramento, custos pendentes e detalhes da OS chamarem
// a mesma coisa pelo mesmo nome.
//
// `material`/`maoDeObra` são os campos de cada tarefa no formulário; `custoMaterial`/
// `custoMaoDeObra` são os totais nas telas de leitura (cards e detalhes da OS).
export const rotulosCustoOS = {
  material: 'Valor Peças',
  maoDeObra: 'Valor Mão de Obra',
  custoMaterial: 'Valor Peças',
  custoMaoDeObra: 'Valor Mão de Obra',
} as const
