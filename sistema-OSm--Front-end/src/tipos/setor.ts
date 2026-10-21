export interface SetorCadastrado {
  id: number
  nome: string
  lojaId: number
  ativo?: boolean
  // URL assinada pelo servidor (a foto mora no R2); ausente = sem foto cadastrada.
  fotoUrl?: string
}

export interface NovoSetorPayload {
  nome: string
  lojaId: number
}

export interface AtualizarSetorPayload extends NovoSetorPayload {
  id: number
}
