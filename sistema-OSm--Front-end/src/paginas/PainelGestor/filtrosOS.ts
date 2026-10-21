export interface FiltrosAvancadosOS {
  maquina: string
  loja: string
  dataInicio: string
  dataFim: string
  valorMinimo: string
  valorMaximo: string
}

export const FILTROS_AVANCADOS_OS_VAZIOS: FiltrosAvancadosOS = {
  maquina: '',
  loja: '',
  dataInicio: '',
  dataFim: '',
  valorMinimo: '',
  valorMaximo: '',
}
