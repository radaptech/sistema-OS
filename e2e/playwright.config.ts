import { defineConfig } from '@playwright/test'

// Um fluxo só, em série: os quatro aparelhos conversam entre si (o que o Solicitante abre é o
// que o Gestor aprova), então rodar em paralelo embaralharia a ordem dos passos.
export default defineConfig({
  testDir: './testes',
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'resultado.json' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://teste.localhost:8090',
    trace: 'retain-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
})
