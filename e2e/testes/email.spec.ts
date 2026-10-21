import { expect, test } from '@playwright/test'
import { ADMIN, SENHA, criarAparelho, entrar, esperarToast, registrar } from './apoio'

// Manda um e-mail DE VERDADE (Resend) para o endereço abaixo. Fica fora da rodada padrão
// para não encher a caixa a cada execução: E2E_EMAIL=1 npx playwright test email
const EMAIL_REAL = process.env.E2E_EMAIL_DESTINO ?? 'davifernadesr@gmail.com'

test.skip(!process.env.E2E_EMAIL, 'só com E2E_EMAIL=1 (manda e-mail de verdade)')
test.describe.configure({ mode: 'serial' })

test('esqueci minha senha manda o link para o e-mail cadastrado', async ({ browser }) => {
  const admin = await criarAparelho(browser, 'Admin (desktop 1920)', 'desktop-grande')
  await entrar(admin, ADMIN.email, ADMIN.senha)
  const p = admin.pagina
  await p.goto('/administrador/usuarios')
  await p.getByRole('main').getByRole('searchbox').fill(EMAIL_REAL)
  await p.waitForLoadState('networkidle')
  if (!(await p.getByText(EMAIL_REAL).count())) {
    // Primeira vez: cria um solicitante com o e-mail real, na primeira loja que tiver setor.
    await p.getByRole('button', { name: 'Novo Usuário' }).click()
    await p.getByRole('button', { name: 'Solicitante', exact: true }).click()
    await p.getByRole('textbox', { name: 'Nome *' }).fill('Dono do e-mail (teste)')
    await p.getByRole('textbox', { name: 'E-mail *' }).fill(EMAIL_REAL)
    await p.getByRole('textbox', { name: 'Senha *' }).fill(SENHA)
    const lojas = p.getByRole('main').getByRole('button', { name: /^Loja E2E/ })
    await lojas.last().click()
    await p.getByRole('main').getByRole('button', { name: /^Padaria/ }).first().click()
    await p.getByRole('button', { name: 'Cadastrar' }).click()
    await esperarToast(p, 'Usuário cadastrado com sucesso.')
  }
  await admin.contexto.close()

  const celular = await criarAparelho(browser, 'Dono do e-mail (iPhone)', 'iphone')
  const c = celular.pagina
  await c.goto('/login')
  await c.getByRole('link', { name: /Esqueci minha senha/ }).click()
  await expect(c).toHaveURL(/esqueci-senha/)
  await c.getByPlaceholder('seu@email.com').fill(EMAIL_REAL)
  const resposta = c.waitForResponse((r) => r.url().includes('/api/') && r.request().method() === 'POST')
  await c.getByRole('button', { name: 'Enviar link' }).click()
  expect((await resposta).status()).toBeLessThan(300)
  await expect(c.getByText(/você receberá um link para criar uma nova senha/)).toBeVisible()
  await registrar(celular, 'link enviado')
  await celular.contexto.close()
})
