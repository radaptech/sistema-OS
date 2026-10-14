// Registra o service worker do PWA (public/sw.js) e avisa quando há versão nova.
//
// O fluxo de atualização: cada deploy gera um sw.js com outro carimbo de versão
// (vite.config.ts), o navegador instala o novo e o deixa ESPERANDO. Aqui a gente
// percebe isso e chama `aoTerNovaVersao` -- a tela mostra o aviso, e só quando o usuário
// clica "Atualizar" o novo assume (PULAR_ESPERA) e a página recarrega. Quem fica com o
// app instalado aberto o dia inteiro (o técnico) nunca daria F5 sozinho.

// Quanto esperar entre checagens com o app aberto. Voltar pro app (aba visível de
// novo) também checa -- é o caso comum no celular.
const INTERVALO_CHECAGEM_MS = 60 * 60_000

export function registrarServiceWorker(
  aoTerNovaVersao: (aplicar: () => void) => void,
) {
  if (!('serviceWorker' in navigator)) {
    return
  }

  // Só recarrega quando foi o usuário que pediu a troca. Sem esta trava, a primeira
  // instalação (o sw.js novo assume a página via clients.claim) recarregaria a tela de
  // quem acabou de abrir o app pela primeira vez.
  let aplicando = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (aplicando) {
      window.location.reload()
    }
  })

  function avisar(esperando: ServiceWorker) {
    aoTerNovaVersao(() => {
      aplicando = true
      esperando.postMessage({ tipo: 'PULAR_ESPERA' })
    })
  }

  window.addEventListener('load', async () => {
    let registro: ServiceWorkerRegistration
    try {
      registro = await navigator.serviceWorker.register('/sw.js')
    } catch {
      // Sem HTTPS (fora de localhost), navegador antigo ou modo privado restrito: o app
      // funciona igual, só não é instalável nem recebe push.
      return
    }

    // Uma versão nova já baixada numa visita anterior e ainda esperando. `controller`
    // nulo é a primeira instalação, que não tem "versão anterior" pra trocar.
    if (registro.waiting && navigator.serviceWorker.controller) {
      avisar(registro.waiting)
    }

    registro.addEventListener('updatefound', () => {
      const novo = registro.installing
      novo?.addEventListener('statechange', () => {
        if (novo.state === 'installed' && navigator.serviceWorker.controller) {
          avisar(novo)
        }
      })
    })

    const checar = () => registro.update().catch(() => {})
    setInterval(checar, INTERVALO_CHECAGEM_MS)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checar()
      }
    })
  })
}
