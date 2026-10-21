// Ferramenta de apoio para escrever os testes: loga, abre uma rota e despeja a árvore de
// acessibilidade + uma captura. Não é teste.
//   node explorar.mjs <email> <senha> <rota> [celular|desktop] [saida.png] [passos.mjs]
// passos.mjs (opcional) exporta `default async (p) => {...}`, rodado depois de abrir a rota.
import { chromium, devices } from '@playwright/test'

const [email, senha, rota, tipo = 'desktop', saida = 'explorar.png', passos] = process.argv.slice(2)
const BASE = process.env.BASE_URL ?? 'http://teste.localhost:8090'

const navegador = await chromium.launch()
const contexto = await navegador.newContext(
  tipo === 'celular' ? { ...devices['Pixel 7'] } : { viewport: { width: 1366, height: 768 } },
)
const pagina = await contexto.newPage()
pagina.on('console', (m) => m.type() === 'error' && console.log('[console]', m.text()))
pagina.on('response', (r) => r.status() >= 400 && console.log('[http]', r.status(), r.url()))

await pagina.goto(`${BASE}/login`)
await pagina.getByPlaceholder('seu@email.com').fill(email)
await pagina.locator('input[type=password]').fill(senha)
await pagina.getByRole('button', { name: 'Entrar' }).click()
await pagina.waitForURL((u) => !u.pathname.startsWith('/login'))
if (rota !== '-') await pagina.goto(`${BASE}${rota}`)
await pagina.waitForLoadState('networkidle')
await pagina.waitForTimeout(500)
if (passos) {
  const { pathToFileURL } = await import('node:url')
  await (await import(pathToFileURL(passos).href)).default(pagina)
  await pagina.waitForTimeout(500)
}

console.log('URL:', pagina.url())
console.log(await pagina.locator('body').ariaSnapshot())
await pagina.screenshot({ path: saida, fullPage: true })
await navegador.close()
