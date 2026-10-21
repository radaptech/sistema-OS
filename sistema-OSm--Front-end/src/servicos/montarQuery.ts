// Monta a query string a partir de um objeto de parâmetros, descartando o que estiver
// vazio — evita mandar ?lojaId=undefined quando o filtro não foi preenchido.
export function montarQuery<T extends object>(parametros: T): string {
  const busca = new URLSearchParams()

  for (const [chave, valor] of Object.entries(parametros as Record<string, unknown>)) {
    if (valor === undefined || valor === null || valor === '') {
      continue
    }

    busca.set(chave, Array.isArray(valor) ? valor.join(',') : String(valor))
  }

  const texto = busca.toString()

  return texto ? `?${texto}` : ''
}
