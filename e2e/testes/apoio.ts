import { expect, test, devices, type Browser, type BrowserContext, type Page } from '@playwright/test'
import path from 'node:path'

// Sufixo desta rodada: cada execução cria os próprios cadastros e usuários, então dá para
// rodar quantas vezes quiser contra o mesmo tenant sem colidir com a rodada anterior.
export const RODADA = Date.now().toString(36).slice(-5)

export const SENHA = 'Teste@123'
export const ADMIN = { email: 'admin@teste.com', senha: SENHA }

export const FOTO = path.join(__dirname, '..', 'arquivos', 'foto.png')

export type Aparelho = {
  nome: string
  contexto: BrowserContext
  pagina: Page
  // Tudo o que deu errado "por baixo" enquanto o teste clicava: erro de console, resposta
  // 4xx/5xx da API. O passo final da suíte falha se aparecer 5xx ou erro de console.
  problemas: string[]
}

// O 401 do boot (GET /autenticacao/sessao sem cookie) é o "não logado", não erro.
const ESPERADOS = [/\/api\/autenticacao\/sessao$/]

export async function criarAparelho(
  navegador: Browser,
  nome: string,
  tipo: 'android' | 'iphone' | 'desktop' | 'desktop-grande',
): Promise<Aparelho> {
  const opcoes = {
    android: { ...devices['Pixel 7'] },
    // WebKit precisa de pacotes de sistema que esta máquina não tem: o iPhone roda no
    // Chromium com a tela, o toque e o user-agent dele.
    iphone: { ...devices['iPhone 14'], defaultBrowserType: undefined },
    desktop: { viewport: { width: 1366, height: 768 } },
    'desktop-grande': { viewport: { width: 1920, height: 1080 } },
  }[tipo]
  const contexto = await navegador.newContext({
    ...opcoes,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    // Sem isto o Chromium nega sozinho e o sininho só mostra "bloqueado": com a permissão
    // dada, o teste consegue clicar em "Ativar" como alguém que aceitou o pedido.
    permissions: ['notifications'],
  })
  const pagina = await contexto.newPage()
  const aparelho: Aparelho = { nome, contexto, pagina, problemas: [] }

  pagina.on('console', (m) => {
    if (m.type() !== 'error') return
    // O navegador repete no console toda resposta 4xx/5xx; essas já entram pelo 'response'.
    if (m.text().startsWith('Failed to load resource')) return
    aparelho.problemas.push(`[console] ${m.text()}`)
  })
  pagina.on('pageerror', (e) => aparelho.problemas.push(`[exceção] ${e.message}`))
  pagina.on('response', (r) => {
    if (r.status() < 400 || !r.url().includes('/api/')) return
    if (r.status() === 401 && ESPERADOS.some((re) => re.test(r.url()))) return
    aparelho.problemas.push(`[http ${r.status()}] ${r.request().method()} ${r.url()}`)
  })
  return aparelho
}

export async function entrar(aparelho: Aparelho, email: string, senha = SENHA) {
  const { pagina } = aparelho
  await pagina.goto('/login')
  await pagina.getByPlaceholder('seu@email.com').fill(email)
  await pagina.locator('input[type=password]').fill(senha)
  await pagina.getByRole('button', { name: 'Entrar' }).click()
  await pagina.waitForURL((u) => !u.pathname.startsWith('/login'))
}

// Captura de tela anexada ao relatório, com o nome do aparelho na frente.
export async function registrar(aparelho: Aparelho, passo: string) {
  await aparelho.pagina.waitForLoadState('networkidle').catch(() => {})
  // Mobile-first: nenhuma tela pode rolar para o lado.
  const sobra = await aparelho.pagina.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  if (sobra > 1) aparelho.problemas.push(`[layout] rolagem lateral de ${sobra}px em "${passo}"`)
  await test.info().attach(`${aparelho.nome} — ${passo}`, {
    body: await aparelho.pagina.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })
}

// Toast de sucesso/erro (react-toastify).
export async function esperarToast(pagina: Page, texto: string | RegExp) {
  await expect(
    pagina.locator('.Toastify__toast').filter({ hasText: texto }).first(),
  ).toBeVisible()
}

// O modal aberto (o de cima, se houver dois). aria-modal separa dos popovers, como o
// painel do sininho, que também é role="dialog".
export function modal(pagina: Page) {
  return pagina.locator('[role="dialog"][aria-modal="true"]').last()
}

// Sino, tema e Sair clicáveis de verdade (nada por cima). O toast cobria os três por 4s
// depois de cada ação.
export async function cabecalhoLivre(pagina: Page) {
  return pagina.evaluate(() =>
    ['Sair', 'Notificações', 'Usar tema'].filter((rotulo) => {
      const botao = [...document.querySelectorAll('header button')].find((b) =>
        (b.getAttribute('aria-label') ?? '').startsWith(rotulo),
      )
      if (!botao) return false
      const r = botao.getBoundingClientRect()
      return !botao.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
    }),
  )
}

// Navegação por cliques Loja → Setor dos painéis do Gestor e do Técnico.
export async function entrarNoSetor(pagina: Page, loja: string, setor: string) {
  const main = pagina.getByRole('main')
  // Espera a lista carregar: pode já estar no nível da loja (só um item) ou ainda no topo.
  await expect(
    main.getByRole('button', { name: new RegExp(`^(${loja}|${setor})`) }).first(),
  ).toBeVisible()
  const botaoLoja = main.getByRole('button', { name: new RegExp(`^${loja}`) }).first()
  if (await botaoLoja.isVisible()) await botaoLoja.click()
  await main.getByRole('button', { name: new RegExp(`^${setor}`) }).first().click()
}

export async function abrirSino(pagina: Page) {
  await pagina.getByRole('button', { name: /^Notificações/ }).click()
  return pagina.getByRole('dialog', { name: 'Notificações' })
}

// "Sem sinal" só para um endpoint. context.setOffline não serve: o app tem service worker,
// e o que passa por ele escapa da emulação de rede do Playwright. context.route pega.
export async function cortarRede(aparelho: Aparelho, padrao: string) {
  await aparelho.contexto.route(padrao, (rota) => rota.abort('internetdisconnected'))
  return () => aparelho.contexto.unroute(padrao)
}

// Sair espera o app terminar (ele desliga o push antes do /logout); navegar no meio
// cancela o logout e a sessão continua valendo.
export async function sair(aparelho: Aparelho) {
  const inicio = Date.now()
  await aparelho.pagina.getByRole('button', { name: 'Sair' }).click()
  await expect(aparelho.pagina).toHaveURL(/\/login/, { timeout: 15_000 })
  const ms = Date.now() - inicio
  test.info().annotations.push({ type: 'tempo do logout', description: `${aparelho.nome}: ${ms} ms` })
  // Levava ~4s: o clique esperava o toast que cobria o botão sumir.
  expect(ms, 'Sair demorou: algo cobre o botão?').toBeLessThan(2500)
  return ms
}
