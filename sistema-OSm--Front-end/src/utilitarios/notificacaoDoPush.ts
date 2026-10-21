// O toque numa notificação push com o app FECHADO: o sw.js abre a url dela com
// `notificacao=<id>` a mais, e o app precisa marcar essa notificação como lida assim que
// a sessão estiver de pé (com o app aberto o caminho é outro: mensagem do sw.js, ver
// useIntegracaoPush).
//
// Lido e tirado da URL ANTES do React Router montar (main.tsx): se o router visse o
// parâmetro, o primeiro setSearchParams de uma tela (o painel consumindo ?os=) o
// regravaria, e um replaceState feito por fora deixaria o router com a URL velha.

const PARAMETRO = 'notificacao'

let pendente: number | null = null

export function capturarNotificacaoDaUrl() {
  const url = new URL(window.location.href)
  const bruto = url.searchParams.get(PARAMETRO)
  if (bruto === null) {
    return
  }
  if (/^[1-9]\d*$/.test(bruto)) {
    pendente = Number(bruto)
  }
  url.searchParams.delete(PARAMETRO)
  window.history.replaceState(window.history.state, '', url)
}

export function guardarNotificacaoPendente(id: number) {
  pendente = id
}

// Devolve uma vez só: quem pegou é quem marca.
export function consumirNotificacaoPendente(): number | null {
  const id = pendente
  pendente = null
  return id
}
