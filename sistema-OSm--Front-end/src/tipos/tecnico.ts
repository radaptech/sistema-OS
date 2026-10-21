export const areasTecnico = [
  'Refrigeração',
  'Elétrica',
  'Mecânica',
  'Hidráulica',
  'Máquinas em Geral',
] as const

export type AreaTecnico = (typeof areasTecnico)[number]

export interface Tecnico {
  id: number
  nome: string
  email: string
  telefone?: string
  area: AreaTecnico
  lojasIds: number[]
  // Tarifa de referência cadastrada pelo Administrador; ausente quando não há.
  valorHora?: number
}

export interface NovoTecnicoPayload {
  nome: string
  email: string
  telefone?: string
  area: AreaTecnico
  lojasIds: number[]
}

export interface AtualizarTecnicoPayload extends NovoTecnicoPayload {
  id: number
}
