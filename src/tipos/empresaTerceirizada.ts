export interface EmpresaTerceirizada {
  id: number
  nome: string
  especialidade?: string
  telefone?: string
  // URL assinada pelo servidor (a foto mora no R2); ausente = sem foto cadastrada.
  fotoUrl?: string
}

export interface NovaEmpresaTerceirizadaPayload {
  nome: string
  especialidade?: string
  telefone?: string
}

export interface AtualizarEmpresaTerceirizadaPayload
  extends NovaEmpresaTerceirizadaPayload {
  id: number
}
