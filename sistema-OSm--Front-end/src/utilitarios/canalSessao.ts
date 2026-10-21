// O cookie de sessão é um só por navegador, e todas as abas o compartilham: logar como
// Gestor numa aba troca a sessão das outras também. Sem aviso, a aba que estava no
// Solicitante continuava mostrando a tela dele enquanto as requisições já saíam com o
// cookie do Gestor (dado errado, calado) — e no F5 caía no painel do Gestor.
//
// A mensagem não carrega a sessão de propósito: quem recebe pergunta ao servidor
// (GET /autenticacao/sessao), que é a fonte da verdade de quem está logado.
const NOME_CANAL = 'sistema-os-sessao'

export function avisarOutrasAbasSessaoMudou(): void {
  if (typeof BroadcastChannel === 'undefined') return

  const canal = new BroadcastChannel(NOME_CANAL)
  canal.postMessage('sessao-mudou')
  canal.close()
}

// Devolve a função de cancelar a inscrição. O BroadcastChannel não entrega a mensagem
// para a própria aba que enviou, então quem logou/saiu não reage ao próprio aviso.
export function escutarSessaoMudouEmOutraAba(aoMudar: () => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {}

  const canal = new BroadcastChannel(NOME_CANAL)
  canal.onmessage = () => aoMudar()
  return () => canal.close()
}
