// Service worker do PWA. Mora em public/ (servido em /sw.js, escopo "/" -- o app
// inteiro) e é JavaScript puro, fora do bundle do Vite: o navegador o baixa e o roda
// separado da página, inclusive com o app fechado (é por ele que o push vai chegar).
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
