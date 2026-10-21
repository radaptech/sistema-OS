// Solicitação de pequeno reparo (lâmpada, vidro, piso, etc.) — diferente da OS de
// Maquinário, não exige cadastro prévio de um item no banco: o Solicitante descreve o
// item na hora. Setor, loja, solicitante e data/hora saem da sessão, no servidor.
export interface NovaSolicitacaoReparoPayload {
  item: string
  descricao: string
}
