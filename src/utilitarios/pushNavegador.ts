// A parte do Web Push que é só do navegador: permissão, PushSubscription, número no
// ícone do app. Nada de React nem de API aqui -- quem fala com o servidor é o
// servicoPush, e quem junta os dois é hooks/usePush.ts.

import type { InscricaoPush } from '../tipos/push'

// Tem tudo o que o push precisa. No iPhone isso só é verdade com o app instalado
// (iOS 16.4+): no Safari comum o PushManager nem existe -- ver precisaInstalarParaPush.
export function navegadorSuportaPush(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

// iPhone/iPad. O iPadOS se apresenta como Mac, então também conta Mac com toque.
export function ehAparelhoApple(): boolean {
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
  )
}

// Aberto pelo ícone da tela inicial (e não numa aba do navegador).
export function estaInstalado(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

// No iPhone o push só existe com o app adicionado à Tela de Início -- no Safari comum
// a tela mostra o passo a passo em vez do botão de ativar.
export function precisaInstalarParaPush(): boolean {
  return ehAparelhoApple() && !estaInstalado()
}

// Pra LER (inscrição atual, notificações na bandeja) basta o registro que já existe --
// getRegistration responde na hora, e sem registro não há inscrição nenhuma. O logout
// passa por aqui e não pode ficar esperando.
async function obterRegistro(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null
  }
  return (await navigator.serviceWorker.getRegistration()) ?? null
}

// Pra INSCREVER o service worker precisa estar ativo (`ready`). Só que `ready` nunca
// resolve se o sw.js não registrou (modo privado restrito, erro no registro) -- o prazo
// evita o botão preso em "Ativando...".
const PRAZO_SERVICE_WORKER_MS = 5_000

function esperarServiceWorkerAtivo(): Promise<ServiceWorkerRegistration | null> {
  const prazo = new Promise<null>((resolver) =>
    setTimeout(() => resolver(null), PRAZO_SERVICE_WORKER_MS),
  )
  return Promise.race([navigator.serviceWorker.ready, prazo])
}

export async function obterInscricaoAtual(): Promise<PushSubscription | null> {
  if (!navegadorSuportaPush()) {
    return null
  }
  const registro = await obterRegistro()
  return registro ? registro.pushManager.getSubscription() : null
}

// A chave VAPID vem em base64url; o subscribe quer os bytes.
function base64UrlParaBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const preenchimento = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + preenchimento)
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const binario = atob(base64)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) {
    bytes[i] = binario.charCodeAt(i)
  }
  return bytes
}

function mesmaChave(inscricao: PushSubscription, chavePublica: string) {
  const atual = inscricao.options.applicationServerKey
  if (!atual) {
    return false
  }
  const esperada = base64UrlParaBytes(chavePublica)
  const recebida = new Uint8Array(atual)
  return (
    recebida.length === esperada.length &&
    recebida.every((byte, i) => byte === esperada[i])
  )
}

// Devolve a inscrição deste navegador feita com a chave atual do servidor, criando se
// precisar. Uma inscrição feita com outra chave (o VAPID foi trocado) não serve: o
// serviço de push recusaria tudo o que o servidor assinar -- então sai e entra de novo.
//
// Pede a permissão se ela ainda não foi dada; por isso a primeira chamada TEM que vir de
// um clique (o navegador ignora o pedido fora de um gesto do usuário). Com a permissão
// já concedida, chamar sem clique (a sincronização ao abrir o app) não mostra nada.
export async function inscreverNoNavegador(
  chavePublica: string,
): Promise<InscricaoPush | null> {
  const registro = await esperarServiceWorkerAtivo()
  if (!registro) {
    return null
  }

  if (Notification.permission !== 'granted') {
    const permissao = await Notification.requestPermission()
    if (permissao !== 'granted') {
      return null
    }
  }

  let inscricao = await registro.pushManager.getSubscription()
  if (inscricao && !mesmaChave(inscricao, chavePublica)) {
    await inscricao.unsubscribe()
    inscricao = null
  }
  inscricao ??= await registro.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlParaBytes(chavePublica),
  })

  return inscricao.toJSON() as InscricaoPush
}

// Cancela a inscrição no navegador. Devolve o endpoint que existia (pra avisar o
// servidor), ou null se não havia nenhuma.
export async function desinscreverNoNavegador(): Promise<string | null> {
  const inscricao = await obterInscricaoAtual()
  if (!inscricao) {
    return null
  }
  const { endpoint } = inscricao
  await inscricao.unsubscribe()
  return endpoint
}

// O número no ícone do app instalado (Badging API: Chrome/Edge no desktop e Android,
// Safari no iPhone com o app instalado). Onde não existe, não faz nada.
export function definirNumeroNoIcone(total: number) {
  if (!('setAppBadge' in navigator)) {
    return
  }
  const pedido =
    total > 0 ? navigator.setAppBadge(total) : navigator.clearAppBadge()
  pedido.catch(() => {})
}

// Tira da bandeja do celular as notificações do app que ainda estão lá. Usado quando
// tudo foi lido (o aviso já não diz nada) e no logout (num celular compartilhado, o
// próximo a pegar não pode ler os avisos do anterior).
export async function limparNotificacoesExibidas() {
  const registro = await obterRegistro()
  if (!registro) {
    return
  }
  const exibidas = await registro.getNotifications()
  exibidas.forEach((notificacao) => notificacao.close())
}
