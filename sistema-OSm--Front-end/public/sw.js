// Service worker do PWA. Mora em public/ (servido em /sw.js, escopo "/" -- o app
// inteiro) e é JavaScript puro, fora do bundle do Vite: o navegador o baixa e o roda
// separado da página, inclusive com o app fechado (é por ele que o push vai chegar).
//
// É também quem recebe o Web Push (fim do arquivo): mostra a notificação, põe o número
// no ícone e, no toque, leva o app até a tela do item.
//
// Sem precache, de propósito: o app não funciona sem a API, então guardar o bundle
// offline só traria o problema clássico de PWA -- o usuário preso numa versão velha. O
// HTML e os assets vêm sempre da rede (o nginx manda index.html/sw.js sem cache e os
// /assets/ com hash no nome, imutáveis).

// Trocado pelo build (plugin `versaoServiceWorker` em vite.config.ts) por um carimbo
// diferente a cada deploy. É isso que muda o conteúdo deste arquivo, faz o navegador
// instalar um service worker novo e o app oferecer "nova versão disponível".
const VERSAO = '__VERSAO__'

// Instala e ESPERA: quem decide a hora de trocar é o usuário, pelo aviso no app
// (registrarServiceWorker.ts manda PULAR_ESPERA). Trocar sozinho no meio de um
// formulário de encerramento recarregaria a tela com os dados digitados.
self.addEventListener('install', () => {})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(self.clients.claim())
})

self.addEventListener('message', (evento) => {
  if (evento.data && evento.data.tipo === 'PULAR_ESPERA') {
    self.skipWaiting()
  }
})

// Só navegação (abrir o app, F5, link): rede primeiro e, sem rede, uma página curta
// dizendo isso -- em vez do dinossauro do navegador dentro do app instalado. Todo o
// resto (API, assets) não passa por aqui: sem respondWith, o navegador segue normal.
self.addEventListener('fetch', (evento) => {
  if (evento.request.mode !== 'navigate') {
    return
  }
  evento.respondWith(fetch(evento.request).catch(() => paginaSemConexao()))
})

// ---------------------------------------------------------------------------------
// Web Push. O servidor (service.MensagemPush no back) manda:
//   { id, tipo, titulo, corpo, url, naoLidas }
// `url` é um caminho do próprio app ("/painel-tecnico?os=12").

self.addEventListener('push', (evento) => {
  const mensagem = lerMensagem(evento)

  evento.waitUntil(
    Promise.all([
      // userVisibleOnly: todo push TEM que virar notificação visível -- o Chrome mostra
      // uma genérica ("o site foi atualizado em segundo plano") se não virar, e pode
      // cortar a inscrição de quem insiste. Por isso não há caminho que pule isto.
      self.registration.showNotification(mensagem.titulo, {
        body: mensagem.corpo,
        icon: '/icones/icone-192.png',
        // Barra de status do Android: só a silhueta (transparência) do PNG é usada.
        badge: '/icones/badge-96.png',
        lang: 'pt-BR',
        // Um aviso por notificação: o mesmo id chegando de novo (reentrega do serviço de
        // push) substitui em vez de duplicar.
        tag: mensagem.id ? `notificacao-${mensagem.id}` : undefined,
        data: { id: mensagem.id, url: mensagem.url },
      }),
      definirNumeroNoIcone(mensagem.naoLidas),
      // Com o app aberto, o sininho busca na hora em vez de esperar o intervalo de 60s.
      avisarAbas({ tipo: 'PUSH_RECEBIDO' }),
    ]),
  )
})

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const { id, url } = evento.notification.data || {}
  evento.waitUntil(abrirNoApp(id, caminhoDoApp(url)))
})

// O navegador renovou (ou perdeu) a inscrição por conta própria. Daqui não dá pra avisar
// o servidor -- o sw.js não tem a sessão nem a URL da API --, então só pede às abas
// abertas pra reenviar; sem aba aberta, o app reenvia ao abrir (useIntegracaoPush).
self.addEventListener('pushsubscriptionchange', (evento) => {
  evento.waitUntil(avisarAbas({ tipo: 'INSCRICAO_MUDOU' }))
})

function lerMensagem(evento) {
  try {
    const dados = evento.data ? evento.data.json() : null
    if (dados && dados.titulo) {
      return dados
    }
  } catch {
    // Payload que não é JSON: cai no genérico abaixo, que ainda leva ao sininho.
  }
  return {
    id: null,
    titulo: 'Solicitação OS',
    corpo: 'Você tem uma notificação nova.',
    url: '/',
    naoLidas: null,
  }
}

// Só caminho do próprio app: a url vem do servidor (e o banco já recusa outra coisa),
// mas uma notificação nunca deve abrir site de fora.
function caminhoDoApp(url) {
  try {
    const destino = new URL(url || '/', self.location.origin)
    if (destino.origin === self.location.origin) {
      return destino.pathname + destino.search
    }
  } catch {
    // url inválida: vai pro início.
  }
  return '/'
}

async function abrirNoApp(id, caminho) {
  const abas = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })

  // App já aberto: traz pra frente e deixa o React navegar (sem recarregar a página e
  // perder o que estiver digitado). Prefere a aba que o usuário viu por último.
  const aba =
    abas.find((cliente) => cliente.focused) ||
    abas.find((cliente) => cliente.visibilityState === 'visible') ||
    abas[0]
  if (aba) {
    await aba.focus()
    aba.postMessage({ tipo: 'ABRIR_NOTIFICACAO', id, url: caminho })
    return
  }

  // App fechado: abre direto na tela do item. O id vai na URL pro app marcar como lida
  // quando a sessão subir (utilitarios/notificacaoDoPush.ts tira o parâmetro de lá).
  const destino = new URL(caminho, self.location.origin)
  if (id) {
    destino.searchParams.set('notificacao', String(id))
  }
  await self.clients.openWindow(destino.href)
}

function definirNumeroNoIcone(total) {
  if (typeof total !== 'number' || !('setAppBadge' in self.navigator)) {
    return Promise.resolve()
  }
  const pedido =
    total > 0 ? self.navigator.setAppBadge(total) : self.navigator.clearAppBadge()
  return pedido.catch(() => {})
}

async function avisarAbas(mensagem) {
  const abas = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })
  abas.forEach((aba) => aba.postMessage(mensagem))
}

function paginaSemConexao() {
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sem conexão · Solicitação OS</title>
<style>
  body { margin: 0; min-height: 100svh; display: grid; place-items: center; background: #f8fafc;
         font-family: system-ui, sans-serif; color: #0f172a; padding: 24px; box-sizing: border-box; }
  main { max-width: 320px; text-align: center; }
  h1 { font-size: 20px; margin: 16px 0 8px; }
  p { color: #64748b; font-size: 14px; line-height: 1.5; margin: 0 0 20px; }
  button { height: 46px; padding: 0 20px; border: 0; border-radius: 12px; background: #2f6e42;
           color: #fff; font-size: 15px; font-weight: 600; }
  @media (prefers-color-scheme: dark) {
    body { background: #0e1211; color: #eef2f1; }
    p { color: #96a29f; }
  }
</style>
</head>
<body>
<main>
  <img src="/icones/icone-192.png" width="72" height="72" alt="" onerror="this.remove()">
  <h1>Sem conexão</h1>
  <p>O Solicitação OS precisa de internet para abrir. Confira o Wi-Fi ou os dados móveis e tente de novo.</p>
  <button onclick="location.reload()">Tentar de novo</button>
</main>
</body>
</html>`
  return new Response(html, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Versao-SW': VERSAO },
  })
}
