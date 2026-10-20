// Quem cai no login sem ter pedido — sessão vencida, ou um link (de notificação, por
// exemplo) aberto já deslogado — volta para onde ia depois de entrar, e a tela diz por
// que foi parar lá. As duas coisas viajam na URL do login (?motivo=expirada&voltar=...),
// que sobrevive ao recarregamento que o api.ts faz no 401.
//
// A sessão dura 14 dias sem uso e 60 no máximo (back: migration 000022), então isto
// aparece pouco — mas quando aparece é para quem estava no meio de alguma coisa.

const MOTIVO_EXPIRADA = 'expirada'

// O 401 do GET /autenticacao/sessao no boot não recarrega a página: a RotaProtegida é que
// manda para o login, logo em seguida. O motivo fica aqui até lá.
let sessaoExpirou = false

export function marcarSessaoExpirada() {
  sessaoExpirou = true
}

// Depois do login, o próximo "não logado" (um logout, por exemplo) não é mais expiração.
export function limparSessaoExpirada() {
  sessaoExpirou = false
}

export function montarUrlLogin(destino: string, expirada = sessaoExpirou): string {
  const parametros = new URLSearchParams()
  if (expirada) {
    parametros.set('motivo', MOTIVO_EXPIRADA)
  }
  if (destinoSeguro(destino)) {
    parametros.set('voltar', destino)
  }
  const texto = parametros.toString()
  return texto ? `/login?${texto}` : '/login'
}

export function sessaoExpirouNaUrl(parametros: URLSearchParams): boolean {
  return parametros.get('motivo') === MOTIVO_EXPIRADA
}

// Só caminho interno do próprio app: "/painel-gestor?os=12" sim; "//outro.site",
// "https://..." ou "/\outro" não — senão o link de login viraria um redirecionador para
// qualquer site (open redirect). "/" e o próprio login não valem a viagem.
export function destinoSeguro(valor: string | null): valor is string {
  return (
    !!valor &&
    valor.startsWith('/') &&
    !valor.startsWith('//') &&
    !valor.startsWith('/\\') &&
    valor !== '/' &&
    !valor.startsWith('/login')
  )
}
