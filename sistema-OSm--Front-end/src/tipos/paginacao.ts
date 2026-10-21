export interface RespostaPaginada<T> {
  dados: T[]
  pagina: number
  totalPaginas: number
  total: number
}
