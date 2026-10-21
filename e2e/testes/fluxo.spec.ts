import { chromium, devices, expect, test, type BrowserContext, type Page } from '@playwright/test'
import {
  ADMIN,
  SENHA,
  FOTO,
  RODADA,
  criarAparelho,
  entrar,
  esperarToast,
  registrar,
  modal,
  entrarNoSetor,
  abrirSino,
  cortarRede,
  sair,
  cabecalhoLivre,
  type Aparelho,
} from './apoio'

test.describe.configure({ mode: 'serial' })

const LOJA = `Loja E2E ${RODADA}`
const SETOR = `Padaria ${RODADA}`
const SETOR_OUTRO = `Açougue ${RODADA}`
const TERCEIRIZADA = `Assistência E2E ${RODADA}`
const MAQUINA = { nome: `Forno Turbo ${RODADA}`, patrimonio: `PAT-${RODADA}` }

type Usuario = { nome: string; email: string }
const usuario = (papel: string, nome: string): Usuario => ({
  nome: `${nome} ${RODADA}`,
  email: `${papel}.${RODADA}@teste.com`,
})
const USUARIOS = {
  tecnico: usuario('tecnico', 'Técnico Teste'),
  gestor: usuario('gestor', 'Gestor Teste'),
  solicitante: usuario('solicitante', 'Solicitante Padaria'),
  solicitanteAcougue: usuario('solicitante2', 'Solicitante Açougue'),
}

function hojeIso() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

// Campos comuns aos quatro perfis. Sem telefone de propósito: nada pode sair por WhatsApp.
async function preencherUsuario(u: Usuario) {
  const p = admin.pagina
  await p.getByRole('textbox', { name: 'Nome *' }).fill(u.nome)
  await p.getByRole('textbox', { name: 'E-mail *' }).fill(u.email)
  await p.getByRole('textbox', { name: 'Senha *' }).fill(SENHA)
}

let admin: Aparelho
let gestor: Aparelho
let tecnico: Aparelho
let solicitante: Aparelho

test.beforeAll(async ({ browser }) => {
  admin = await criarAparelho(browser, 'Admin (desktop 1920)', 'desktop-grande')
  gestor = await criarAparelho(browser, 'Gestor (desktop 1366)', 'desktop')
  tecnico = await criarAparelho(browser, 'Técnico (Android)', 'android')
  solicitante = await criarAparelho(browser, 'Solicitante (iPhone)', 'iphone')
})

test.afterAll(async () => {
  for (const a of [admin, gestor, tecnico, solicitante]) await a?.contexto.close()
})

// Os testes que provocam erro de propósito (nota repetida, rede cortada) deixam rastro
// (4xx, toast de erro); isso é esperado e não pode derrubar a verificação final.
const provocados: string[] = []
let marcas: number[] = []
test.beforeEach(() => {
  marcas = [admin, gestor, tecnico, solicitante].map((a) => a?.problemas.length ?? 0)
})
test.afterEach(() => {
  const titulo = test.info().title
  if (!/sem sinal|sem rede|repetida|servidor recusou/.test(titulo)) return
  ;[admin, gestor, tecnico, solicitante].forEach((a, i) => {
    if (!a) return
    provocados.push(...a.problemas.splice(marcas[i]).map((x) => `${titulo} — ${a.nome}: ${x}`))
  })
})

// Os cadastros terminam com navegar(-1): o teste entra pela listagem e clica em "Novo…",
// como o usuário faz, e confere que voltou para ela com o item novo na lista.
async function abrirNovo(lista: string, botao: string) {
  const p = admin.pagina
  await p.goto(lista)
  await p.getByRole('button', { name: botao }).click()
}

// Loja, setor e terceirizada ficam no formulário depois de criar (para cadastrar vários em
// sequência) e o teste volta pelo botão; usuário e máquina voltam sozinhos. Nos dois casos a
// lista tem que mostrar o item novo -- é o que pega mutação que esquece de invalidar o cache.
async function salvarEVoltar(lista: string, toast: string, itemNaLista: string) {
  const p = admin.pagina
  await p.getByRole('button', { name: 'Cadastrar' }).click()
  await esperarToast(p, toast)
  if (!new RegExp(`${lista}$`).test(p.url())) {
    await p.waitForTimeout(300)
    if (!new RegExp(`${lista}$`).test(p.url()))
      await p.getByRole('main').getByRole('button', { name: 'Voltar' }).click()
  }
  await expect(p).toHaveURL(new RegExp(`${lista}$`))
  // As listas paginam e as rodadas anteriores continuam no tenant: procura pela busca.
  const busca = p.getByRole('searchbox')
  if (await busca.count()) await busca.first().fill(itemNaLista)
  await expect(p.getByText(itemNaLista).first()).toBeVisible()
}

test.describe('1. Administrador monta a estrutura', () => {
  test('entra no painel', async () => {
    await entrar(admin, ADMIN.email, ADMIN.senha)
    await expect(admin.pagina).toHaveURL(/painel-administrador/)
    await expect(admin.pagina.getByRole('heading', { name: 'Painel do Administrador' })).toBeVisible()
    await registrar(admin, 'painel')
  })

  test('cadastra loja com foto', async () => {
    const p = admin.pagina
    await abrirNovo('/administrador/lojas', 'Nova Loja')
    await p.locator('input[type=file]').first().setInputFiles(FOTO)
    await p.getByRole('textbox', { name: 'Nome *' }).fill(LOJA)
    await salvarEVoltar('/administrador/lojas', 'Loja cadastrada com sucesso.', LOJA)
    await registrar(admin, 'lojas')
  })

  test('cadastra dois setores na loja', async () => {
    const p = admin.pagina
    for (const nome of [SETOR, SETOR_OUTRO]) {
      await abrirNovo('/administrador/setores', 'Novo Setor')
      await p.getByRole('textbox', { name: 'Nome *' }).fill(nome)
      await p.getByRole('combobox', { name: 'Loja *' }).selectOption({ label: LOJA })
      await salvarEVoltar('/administrador/setores', 'Setor cadastrado com sucesso.', nome)
    }
    await registrar(admin, 'setores')
  })

  test('cadastra empresa terceirizada', async () => {
    const p = admin.pagina
    await abrirNovo('/administrador/empresas-terceirizadas', 'Nova Empresa')
    await p.getByRole('textbox', { name: 'Nome *' }).fill(TERCEIRIZADA)
    await p.getByRole('textbox', { name: 'Especialidade' }).fill('Fornos e masseiras')
    await p.getByRole('textbox', { name: 'Telefone' }).fill('(11) 4002-8922')
    await salvarEVoltar(
      '/administrador/empresas-terceirizadas',
      'Empresa terceirizada cadastrada com sucesso.',
      TERCEIRIZADA,
    )
    await registrar(admin, 'terceirizadas')
  })

  test('cadastra técnico', async () => {
    const p = admin.pagina
    await abrirNovo('/administrador/usuarios', 'Novo Usuário')
    await p.getByRole('button', { name: 'Técnico', exact: true }).click()
    await preencherUsuario(USUARIOS.tecnico)
    await p.getByRole('button', { name: LOJA }).click()
    await p.getByRole('combobox', { name: 'Área de Atuação *' }).selectOption({ label: 'Mecânica' })
    await p.getByRole('spinbutton', { name: 'Valor em Hora (R$)' }).fill('80')
    await salvarEVoltar('/administrador/usuarios', 'Usuário cadastrado com sucesso.', USUARIOS.tecnico.email)
  })

  test('cadastra gestor só do setor Padaria', async () => {
    const p = admin.pagina
    await abrirNovo('/administrador/usuarios', 'Novo Usuário')
    await p.getByRole('button', { name: 'Gestor', exact: true }).click()
    await preencherUsuario(USUARIOS.gestor)
    await p.getByRole('button', { name: LOJA }).click()
    await p.getByRole('button', { name: SETOR }).click()
    await registrar(admin, 'formulário do gestor')
    await salvarEVoltar('/administrador/usuarios', 'Usuário cadastrado com sucesso.', USUARIOS.gestor.email)
  })

  test('cadastra solicitantes da Padaria e do Açougue', async () => {
    const p = admin.pagina
    for (const [u, setor] of [
      [USUARIOS.solicitante, SETOR],
      [USUARIOS.solicitanteAcougue, SETOR_OUTRO],
    ] as const) {
      await abrirNovo('/administrador/usuarios', 'Novo Usuário')
      await p.getByRole('button', { name: 'Solicitante', exact: true }).click()
      await preencherUsuario(u)
      await p.getByRole('button', { name: LOJA }).click()
      await p.getByRole('button', { name: setor }).click()
      await salvarEVoltar('/administrador/usuarios', 'Usuário cadastrado com sucesso.', u.email)
    }
    await registrar(admin, 'usuários')
  })

  test('cadastra máquina na Padaria com preventiva', async () => {
    const p = admin.pagina
    await abrirNovo('/administrador/maquinas', 'Nova Máquina')
    await p.locator('input[type=file]').first().setInputFiles(FOTO)
    await p.getByRole('textbox', { name: 'Nome *' }).fill(MAQUINA.nome)
    await p.getByRole('textbox', { name: 'Número do Patrimônio *' }).fill(MAQUINA.patrimonio)
    await p.getByRole('textbox', { name: 'Série *' }).fill(`SN-${RODADA}`)
    await p.getByRole('textbox', { name: 'Marca' }).fill('Prática')
    await p.getByRole('combobox', { name: 'Criticidade *' }).selectOption('Alta')
    await p.getByRole('combobox', { name: 'Loja *' }).selectOption({ label: LOJA })
    await p.getByRole('combobox', { name: 'Setor *' }).selectOption({ label: SETOR })

    await p.getByRole('button', { name: 'Adicionar' }).click()
    await p.getByRole('combobox', { name: 'Técnico Responsável *' }).selectOption({
      label: `${USUARIOS.tecnico.nome} — Mecânica`,
    })
    await p.getByPlaceholder('Descreva o procedimento de manutenção...').fill(
      'Limpeza do queimador e troca da vedação da porta',
    )
    await p.getByRole('spinbutton', { name: 'Intervalo (dias) *' }).fill('30')
    await p.getByRole('textbox', { name: 'Próxima Data *' }).fill(hojeIso())
    await registrar(admin, 'modal da preventiva')
    await p.getByRole('button', { name: 'Salvar' }).click()

    await salvarEVoltar('/administrador/maquinas', 'Máquina cadastrada com sucesso.', MAQUINA.nome)
    await registrar(admin, 'máquinas')
  })
})

const DESCRICAO_MAQUINA = 'Forno não aquece: a resistência desliga sozinha depois de uns 5 minutos ligado.'
const ITEM_REPARO = `Lâmpada LED ${RODADA}`
const ITEM_REPARO_ACOUGUE = `Porta da câmara fria ${RODADA}`
const ITEM_OS_DIRETA = `Torneira da pia ${RODADA}`
const MOTIVO_REJEICAO = 'Lâmpada já foi trocada pela equipe da loja hoje de manhã.'

test.describe('2. Solicitante abre pedidos pelo celular', () => {
  test('entra e vê a home zerada', async () => {
    await entrar(solicitante, USUARIOS.solicitante.email)
    const p = solicitante.pagina
    await expect(p).toHaveURL(/home-solicitante/)
    await expect(p.getByRole('heading', { name: 'O que deseja fazer?' })).toBeVisible()
    // O toast de "Login realizado" está na tela agora: não pode cobrir o cabeçalho.
    await expect(p.locator('.Toastify__toast').first()).toBeVisible()
    expect(await cabecalhoLivre(p), 'botões do cabeçalho cobertos').toEqual([])
    await registrar(solicitante, 'home')
  })

  test('não deixa enviar sem foto nem com descrição curta', async () => {
    const p = solicitante.pagina
    await p.getByRole('button', { name: /Nova Solicitação/ }).click()
    await expect(p).toHaveURL(/nova-solicitacao/)
    await p.getByRole('combobox', { name: 'Máquina' }).selectOption({
      label: `${MAQUINA.nome} · ${MAQUINA.patrimonio}`,
    })
    await p.getByRole('textbox', { name: 'Descrição do Problema' }).fill('curta')
    await p.getByRole('button', { name: 'Enviar Solicitação' }).click()
    await expect(p).toHaveURL(/nova-solicitacao/)
    await registrar(solicitante, 'validação')
    await p.getByRole('textbox', { name: 'Descrição do Problema' }).fill(DESCRICAO_MAQUINA)
    await p.getByRole('button', { name: 'Enviar Solicitação' }).click()
    await esperarToast(p, 'Anexe uma foto antes de enviar a solicitação.')
  })

  test('abre solicitação de maquinário que afeta a produção', async () => {
    const p = solicitante.pagina
    await p.locator('input[type=file][accept^="image"]').setInputFiles(FOTO)
    const afeta = p.getByRole('checkbox', { name: 'Afeta Produção' })
    await p.locator('label', { has: afeta }).click()
    await expect(afeta).toBeChecked()
    await registrar(solicitante, 'maquinário preenchido')
    await p.getByRole('button', { name: 'Enviar Solicitação' }).click()
    await esperarToast(p, 'Solicitação enviada com sucesso.')
    await registrar(solicitante, 'depois de enviar')
  })

  test('abre pequeno reparo', async () => {
    const p = solicitante.pagina
    await p.goto('/home-solicitante')
    await p.getByRole('button', { name: /Nova Solicitação/ }).click()
    await p.getByRole('radio', { name: /Pequenos Reparos/ }).click()
    await registrar(solicitante, 'formulário de reparo')
    await p.getByRole('textbox', { name: /^Item/ }).fill(ITEM_REPARO)
    await p.getByRole('textbox', { name: /Descrição/ }).fill('Lâmpada do corredor da padaria queimou.')
    await p.locator('input[type=file][accept^="image"]').setInputFiles(FOTO)
    await p.getByRole('button', { name: 'Enviar Solicitação' }).click()
    await esperarToast(p, 'Solicitação enviada com sucesso.')
  })

  test('vê as duas em Minhas Solicitações', async () => {
    const p = solicitante.pagina
    await p.goto('/home-solicitante')
    await p.getByRole('button', { name: /Minhas Solicitações/ }).click()
    await expect(p).toHaveURL(/minhas-solicitacoes/)
    await expect(p.getByText(MAQUINA.nome).first()).toBeVisible()
    await expect(p.getByText(ITEM_REPARO).first()).toBeVisible()
    await registrar(solicitante, 'minhas solicitações')
  })

  test('sai e o solicitante do Açougue abre um reparo no mesmo celular', async () => {
    const p = solicitante.pagina
    await sair(solicitante)
    await entrar(solicitante, USUARIOS.solicitanteAcougue.email)
    await p.getByRole('button', { name: /Nova Solicitação/ }).click()
    // O Açougue não tem máquina: a lista de máquinas tem que vir vazia (escopo do setor).
    await expect(
      p.getByRole('combobox', { name: 'Máquina' }).getByRole('option', { name: new RegExp(MAQUINA.nome) }),
    ).toHaveCount(0)
    await p.getByRole('radio', { name: /Pequenos Reparos/ }).click()
    await p.getByRole('textbox', { name: /^Item/ }).fill(ITEM_REPARO_ACOUGUE)
    await p.getByRole('textbox', { name: /Descrição/ }).fill('Porta não fecha direito, borracha solta.')
    await p.locator('input[type=file][accept^="image"]').setInputFiles(FOTO)
    await p.getByRole('button', { name: 'Enviar Solicitação' }).click()
    await esperarToast(p, 'Solicitação enviada com sucesso.')
    await sair(solicitante)
    await entrar(solicitante, USUARIOS.solicitante.email)
  })
})

// Ids das solicitações desta rodada, lidos da tela do Gestor e usados pelos passos seguintes.
const ids = { solicitacaoMaquina: 0, solicitacaoReparo: 0, os: 0 }

test.describe('3. Gestor faz a triagem no desktop', () => {
  test('entra e o sininho avisa das solicitações novas', async () => {
    await entrar(gestor, USUARIOS.gestor.email)
    const p = gestor.pagina
    await expect(p).toHaveURL(/painel-gestor/)
    const sino = await abrirSino(p)
    await expect(sino.getByRole('button', { name: new RegExp(`Nova solicitação.*${MAQUINA.nome}`) })).toBeVisible()
    await expect(sino.getByRole('button', { name: new RegExp(`Nova solicitação.*${ITEM_REPARO}`) })).toBeVisible()
    // O pedido do Açougue está fora do escopo deste gestor: não pode nem avisar.
    await expect(sino.getByText(ITEM_REPARO_ACOUGUE)).toHaveCount(0)
    await registrar(gestor, 'sininho')
  })

  test('clicar na notificação abre o detalhe com as fotos', async () => {
    const p = gestor.pagina
    const sino = p.getByRole('dialog', { name: 'Notificações' })
    await sino.getByRole('button', { name: new RegExp(`Nova solicitação.*${MAQUINA.nome}`) }).click()
    const m = modal(p)
    await expect(m.getByText(/^Solicitação #\d+/)).toBeVisible()
    ids.solicitacaoMaquina = Number((await m.getByText(/^Solicitação #\d+/).textContent())!.match(/\d+/)![0])
    await expect(m.getByText(DESCRICAO_MAQUINA)).toBeVisible()
    await expect(m.getByText('Afeta Produção')).toBeVisible()
    // A foto vem por URL assinada do R2: tem que carregar de verdade, não só existir a tag.
    const foto = m.getByRole('img', { name: 'Foto do defeito' })
    await expect(foto).toBeVisible()
    await expect.poll(() => foto.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
    await registrar(gestor, 'detalhe da solicitação')
    await p.keyboard.press('Escape')
    await expect(m).toBeHidden()
  })

  test('só vê a Padaria (escopo do servidor)', async () => {
    const p = gestor.pagina
    await p.goto('/painel-gestor')
    await entrarNoSetor(p, LOJA, SETOR)
    await expect(p.getByText(MAQUINA.nome).first()).toBeVisible()
    await expect(p.getByText(ITEM_REPARO).first()).toBeVisible()
    await expect(p.getByText(ITEM_REPARO_ACOUGUE)).toHaveCount(0)
    await expect(p.getByRole('main').getByRole('button', { name: new RegExp(`^${SETOR_OUTRO}`) })).toHaveCount(0)
    await registrar(gestor, 'fila da Padaria')
  })

  test('rejeita o pequeno reparo com motivo', async () => {
    const p = gestor.pagina
    const card = p.getByRole('main').locator('div').filter({ hasText: ITEM_REPARO }).filter({
      has: p.getByRole('button', { name: 'Rejeitar solicitação' }),
    }).last()
    ids.solicitacaoReparo = Number((await card.textContent())!.match(/#(\d+)/)![1])
    await card.getByRole('button', { name: 'Rejeitar solicitação' }).click()
    const m = modal(p)
    await m.getByRole('textbox', { name: 'Motivo da Rejeição *' }).fill('curto')
    await m.getByRole('button', { name: 'Rejeitar', exact: true }).click()
    await expect(m).toBeVisible() // motivo curto não passa
    await m.getByRole('textbox', { name: 'Motivo da Rejeição *' }).fill(MOTIVO_REJEICAO)
    await m.getByRole('button', { name: 'Rejeitar', exact: true }).click()
    await esperarToast(p, `Solicitação #${ids.solicitacaoReparo} rejeitada.`)
    await expect(p.getByRole('button', { name: /^Rejeitadas 1/ })).toBeVisible()
  })

  test('abre OS do forno para o técnico com urgência alta', async () => {
    const p = gestor.pagina
    await entrarNoSetor(p, LOJA, SETOR)
    const card = p.getByRole('main').locator('div').filter({ hasText: `#${ids.solicitacaoMaquina}` }).filter({
      has: p.getByRole('button', { name: 'Abrir OS', exact: true }),
    }).last()
    await card.getByRole('button', { name: 'Abrir OS', exact: true }).click()
    const m = modal(p)
    await m.getByRole('button', { name: 'Alta', exact: true }).click()
    await m.getByRole('combobox').selectOption({ label: `${USUARIOS.tecnico.nome} — Mecânica` })
    await registrar(gestor, 'modal abrir OS')
    await m.getByRole('button', { name: 'Abrir OS', exact: true }).click()
    await esperarToast(p, `OS aberta para a solicitação #${ids.solicitacaoMaquina}.`)
  })

  test('a OS aparece em "OS em Andamento"', async () => {
    const p = gestor.pagina
    await p.getByRole('button', { name: 'OS em Andamento' }).click()
    await entrarNoSetor(p, LOJA, SETOR)
    await expect(p.getByText(MAQUINA.nome).first()).toBeVisible()
    const texto = await p.getByRole('main').textContent()
    ids.os = Number(texto!.match(/OS #(\d+)/)?.[1] ?? texto!.match(/#(\d+)/)![1])
    await registrar(gestor, 'OS em andamento')
  })
})

test.describe('4. Solicitante acompanha o resultado', () => {
  test('o sininho avisa que uma foi aceita e a outra rejeitada', async () => {
    const p = solicitante.pagina
    await p.goto('/home-solicitante')
    const sino = await abrirSino(p)
    await expect(sino.getByRole('listitem').filter({ hasText: /aceita|OS aberta|virou OS/i }).first()).toBeVisible()
    await expect(sino.getByRole('listitem').filter({ hasText: /rejeitada/i }).first()).toBeVisible()
    await registrar(solicitante, 'sininho')
  })

  test('a rejeitada abre pelo aviso e mostra o motivo', async () => {
    const p = solicitante.pagina
    const sino = p.getByRole('dialog', { name: 'Notificações' })
    await sino.getByRole('listitem').filter({ hasText: /rejeitada/i }).first().getByRole('button').click()
    await expect(p).toHaveURL(/minhas-solicitacoes/)
    const m = modal(p)
    await expect(m.getByText(MOTIVO_REJEICAO)).toBeVisible()
    await registrar(solicitante, 'detalhe da rejeitada')
    await m.getByRole('button', { name: 'Fechar' }).first().click()
  })

  test('Minhas Solicitações: forno convertido, reparo rejeitado com motivo', async () => {
    const p = solicitante.pagina
    await p.getByRole('button', { name: 'Rejeitada', exact: true }).click()
    await expect(p.getByText(ITEM_REPARO).first()).toBeVisible()
    await expect(p.getByText(MOTIVO_REJEICAO).first()).toBeVisible()
    await p.getByRole('button', { name: 'Convertida', exact: true }).click()
    await expect(p.getByText(MAQUINA.nome).first()).toBeVisible()
    await expect(p.getByText(ITEM_REPARO)).toHaveCount(0)
    await registrar(solicitante, 'filtro convertida')
  })
})

const MOTIVO_PAUSA = 'Aguardando resistência nova do fornecedor.'

test.describe('5. Técnico executa a OS no celular', () => {
  test('entra e o aviso de OS nova abre o detalhe', async () => {
    await entrar(tecnico, USUARIOS.tecnico.email)
    const p = tecnico.pagina
    await expect(p).toHaveURL(/painel-tecnico/)
    const sino = await abrirSino(p)
    await sino.getByRole('listitem').filter({ hasText: MAQUINA.nome }).first().getByRole('button').click()
    const m = modal(p)
    await expect(m.getByText(DESCRICAO_MAQUINA)).toBeVisible()
    await registrar(tecnico, 'detalhe pelo aviso')
    await m.getByRole('button', { name: 'Fechar' }).first().click()
  })

  test('acha a OS por Loja → Setor, com urgência e máquina parada', async () => {
    const p = tecnico.pagina
    await p.goto('/painel-tecnico')
    await entrarNoSetor(p, LOJA, SETOR)
    const card = cardOS(p)
    await expect(card).toContainText('Alta')
    await expect(card).toContainText('Máquina Parada')
    await expect(card).toContainText('Aberta')
    await registrar(tecnico, 'card da OS')
  })

  test('vê a solicitação original com a foto', async () => {
    const p = tecnico.pagina
    await cardOS(p).getByRole('button', { name: 'Ver solicitação original' }).click()
    const m = modal(p)
    const foto = m.getByRole('img', { name: 'Foto do defeito' })
    await expect.poll(() => foto.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
    await m.getByRole('button', { name: 'Fechar' }).first().click()
  })

  test('inicia o atendimento', async () => {
    const p = tecnico.pagina
    await cardOS(p).getByRole('button', { name: 'Iniciar Atendimento' }).click()
    await esperarToast(p, `OS #${ids.os} iniciada.`)
    await expect(cardOS(p)).toContainText('Em Andamento')
  })

  test('pausa com motivo (motivo vazio não passa)', async () => {
    const p = tecnico.pagina
    await cardOS(p).getByRole('button', { name: 'Pausar' }).click()
    const m = modal(p)
    await m.getByRole('button', { name: 'Pausar OS' }).click()
    await expect(m).toBeVisible()
    await m.getByRole('textbox', { name: 'Motivo da Pausa *' }).fill(MOTIVO_PAUSA)
    await m.getByRole('button', { name: 'Pausar OS' }).click()
    await esperarToast(p, `OS #${ids.os} pausada.`)
    await p.getByRole('button', { name: 'Pendentes / Pausadas' }).click()
    await entrarNoSetor(p, LOJA, SETOR)
    await expect(cardOS(p)).toContainText(MOTIVO_PAUSA)
    await registrar(tecnico, 'OS pausada')
  })

  test('ao mesmo tempo, o gestor vê a pausa e o motivo no desktop', async () => {
    const p = gestor.pagina
    await p.goto('/painel-gestor?aba=andamento')
    await p.getByRole('button', { name: 'OS em Andamento' }).click()
    await entrarNoSetor(p, LOJA, SETOR)
    await expect(p.getByText(MOTIVO_PAUSA).first()).toBeVisible()
    await registrar(gestor, 'gestor vê a pausa')
  })

  test('aciona a empresa terceirizada com a OS pausada', async () => {
    const p = tecnico.pagina
    await cardOS(p).getByRole('button', { name: /Acionar empresa terceirizada|Trocar empresa/ }).click()
    const m = modal(p)
    await m.getByRole('combobox', { name: 'Empresa Terceirizada *' }).selectOption({
      label: `${TERCEIRIZADA} — Fornos e masseiras`,
    })
    await m.getByRole('button', { name: 'Acionar' }).click()
    await expect(m).toBeHidden()
    await expect(cardOS(p)).toContainText(TERCEIRIZADA)
    await registrar(tecnico, 'terceiro acionado')
  })

  test('retoma o atendimento', async () => {
    const p = tecnico.pagina
    await cardOS(p).getByRole('button', { name: /Retomar/ }).click()
    await esperarToast(p, `OS #${ids.os} retomada.`)
    await p.getByRole('button', { name: 'OS em Aberto' }).click()
    await entrarNoSetor(p, LOJA, SETOR)
    await expect(cardOS(p)).toContainText('Em Andamento')
  })

  test('sem sinal no celular, o modal de encerrar continua aberto com tudo o que foi digitado', async () => {
    const p = tecnico.pagina
    await cardOS(p).getByRole('button', { name: 'Finalizar OS' }).click()
    const m = modal(p)
    if ((await m.getByRole('button', { name: /Remover custo/ }).count()) === 0)
      await m.getByRole('button', { name: 'Adicionar custo' }).click()
    await m.getByRole('textbox', { name: 'Descrição *', exact: true }).first().fill('Troca da resistência')
    await m.getByRole('spinbutton', { name: 'Valor Peças (R$) *' }).first().fill('180')
    await m.getByRole('combobox', { name: 'Tipo de OS *' }).selectOption('Corretiva')
    await m.getByRole('textbox', { name: 'Defeito Constatado *' }).fill('Resistência do forno queimada.')
    await m.getByRole('textbox', { name: 'Causa Raiz *' }).fill('Vedação gasta forçava a resistência.')
    await m.getByRole('textbox', { name: 'Solução Aplicada *' }).fill('Resistência e vedação trocadas.')
    const religar = await cortarRede(tecnico, '**/api/ordens-servico/*/encerrar')
    await m.getByRole('button', { name: 'Encerrar OS' }).click()
    await expect(p.locator('.Toastify__toast--error').first()).toBeVisible()
    await religar()
    await registrar(tecnico, 'depois de encerrar sem sinal')
    await expect(m).toBeVisible()
    await expect(m.getByRole('textbox', { name: 'Defeito Constatado *' })).toHaveValue('Resistência do forno queimada.')
    await expect(m.getByRole('button', { name: 'Encerrar OS' })).toBeEnabled()
  })

  test('encerra com duas tarefas de custo e nota fiscal', async () => {
    const p0 = tecnico.pagina
    if (await modal(p0).isVisible()) await modal(p0).getByRole('button', { name: 'Cancelar' }).click()
    await p0.goto('/painel-tecnico')
    await entrarNoSetor(p0, LOJA, SETOR)
    const p = tecnico.pagina
    await cardOS(p).getByRole('button', { name: 'Finalizar OS' }).click()
    const m = modal(p)
    await m.getByRole('button', { name: 'Encerrar OS' }).click()
    await expect(m).toBeVisible() // formulário vazio não passa

    if ((await m.getByRole('button', { name: /Remover custo/ }).count()) === 0)
      await m.getByRole('button', { name: 'Adicionar custo' }).click()
    await m.getByRole('button', { name: 'Adicionar custo' }).click()
    const descricoes = m.getByRole('textbox', { name: 'Descrição *', exact: true })
    const pecas = m.getByRole('spinbutton', { name: 'Valor Peças (R$) *' })
    const maoDeObra = m.getByRole('spinbutton', { name: 'Valor Mão de Obra (R$)' })
    await descricoes.nth(0).fill('Troca da resistência')
    await pecas.nth(0).fill('180')
    await maoDeObra.nth(0).fill('90')
    await descricoes.nth(1).fill('Vedação da porta')
    await pecas.nth(1).fill('45.50')
    await maoDeObra.nth(1).fill('0')
    await expect(m.getByText('R$ 315,50').first()).toBeVisible()

    await m.getByRole('switch').click()
    await m.getByRole('combobox', { name: 'Tipo de OS *' }).selectOption('Corretiva')
    await m.getByRole('textbox', { name: 'Defeito Constatado *' }).fill('Resistência do forno queimada.')
    await m.getByRole('textbox', { name: 'Causa Raiz *' }).fill('Vedação gasta deixava o calor escapar e forçava a resistência.')
    await m.getByRole('textbox', { name: 'Solução Aplicada *' }).fill('Resistência e vedação trocadas, forno testado por 30 minutos.')
    await registrar(tecnico, 'modal de encerramento')
    await m.getByRole('button', { name: 'Encerrar OS' }).click()
    await esperarToast(p, `OS #${ids.os} encerrada com sucesso.`)
  })

  test('a OS aparece em "OS Concluídas"', async () => {
    const p = tecnico.pagina
    await p.getByRole('button', { name: 'OS Concluídas' }).click()
    await entrarNoSetor(p, LOJA, SETOR)
    const maquina = p.getByRole('main').getByRole('button', { name: new RegExp(MAQUINA.nome) }).first()
    if (await maquina.isVisible().catch(() => false)) await maquina.click()
    await expect(p.getByText(`#${ids.os}`).first()).toBeVisible()
    await registrar(tecnico, 'concluídas')
  })
})

function cardOS(p: import('@playwright/test').Page) {
  return p.getByRole('main').locator('div').filter({ hasText: `#${ids.os}` }).filter({
    has: p.getByRole('button', { name: 'Ver solicitação original' }),
  }).last()
}

test.describe('6. Administrador confere o custo e fecha a OS', () => {
  test('a OS está em Custos Pendentes sem nota informada', async () => {
    const p = admin.pagina
    await p.goto('/administrador/custos-pendentes')
    await p.getByRole('main').getByRole('searchbox').fill(MAQUINA.patrimonio)
    // A tela navega Loja → Setor como o painel do Gestor.
    await entrarNoSetor(p, LOJA, SETOR)
    const card = p.getByRole('main').locator('div').filter({ hasText: `#${ids.os}` }).filter({
      has: p.getByRole('button', { name: 'Editar Custos' }),
    }).last()
    await expect(card).toContainText('Terceiros')
    await expect(card).toContainText('R$ 225,50') // peças: 180 + 45,50
    await expect(card).toContainText('R$ 90,00') // mão de obra
    await expect(card).toContainText('Nota Fiscal ainda não informada')
    await registrar(admin, 'custos pendentes')
  })

  test('nota fiscal repetida: o servidor recusa com 409 e a tela avisa', async () => {
    const p = admin.pagina
    await p.getByRole('main').getByRole('button', { name: 'Editar Custos' }).first().click()
    const m = modal(p)
    for (let i = 0; i < 2; i++) await m.getByRole('button', { name: 'Adicionar nota' }).click()
    for (const i of [0, 1]) {
      await m.getByRole('textbox', { name: 'Número *' }).nth(i).fill(`NF${RODADA}`)
      await m.getByRole('textbox', { name: 'Série' }).nth(i).fill('1')
    }
    const resposta = p.waitForResponse((r) => r.url().includes(`/ordens-servico/${ids.os}/custo`))
    await m.getByRole('button', { name: 'Salvar Custos' }).click()
    expect((await resposta).status()).toBe(409)
    await expect(p.locator('.Toastify__toast--error').first()).toBeVisible()
    // O modal fica aberto com as notas, para o admin corrigir em vez de redigitar tudo.
    await expect(m).toBeVisible()
    await expect(m.getByRole('textbox', { name: 'Número *' }).nth(1)).toHaveValue(`NF${RODADA}`)
    await registrar(admin, 'nota repetida')
  })

  test('sem rede, o modal de custo continua aberto com o que foi digitado', async () => {
    const p = admin.pagina
    const m = modal(p)
    await m.getByRole('button', { name: 'Remover nota fiscal 2' }).click()
    await m.getByRole('textbox', { name: 'Número *' }).first().fill('SEM-REDE')
    const religar = await cortarRede(admin, '**/api/ordens-servico/*/custo')
    await m.getByRole('button', { name: 'Salvar Custos' }).click()
    await expect(p.locator('.Toastify__toast--error').first()).toBeVisible()
    await religar()
    await expect(m).toBeVisible()
    await expect(m.getByRole('textbox', { name: 'Número *' }).first()).toHaveValue('SEM-REDE')
  })

  test('corrige o valor, registra a nota e salva', async () => {
    const p = admin.pagina
    // Continua no mesmo modal que ficou aberto depois do erro de rede.
    const m = modal(p)
    await m.getByRole('textbox', { name: 'Número *' }).first().fill(`NF${RODADA}`)
    await m.getByRole('textbox', { name: 'Série' }).first().fill('1')
    await m.getByRole('spinbutton', { name: 'Valor Peças (R$) *' }).nth(1).fill('50')
    await expect(m.getByText('R$ 320,00').first()).toBeVisible()
    await m.getByRole('textbox', { name: 'Descrição do Serviço' }).fill('Troca de resistência e vedação pela assistência.')
    await m.getByRole('button', { name: 'Salvar Custos' }).click()
    await esperarToast(p, `Custos atualizados para a OS #${ids.os}.`)
    await p.getByRole('button', { name: /^Revisadas/ }).click()
    // O nível (loja/setor) fica na URL ao trocar de aba: cai direto no mesmo setor.
    await expect(p).toHaveURL(/setor=/)
    await expect(p.getByText(`#${ids.os}`).first()).toBeVisible()
    await registrar(admin, 'revisadas')
  })

  test('OS Finalizadas mostra o total corrigido', async () => {
    const p = admin.pagina
    await p.goto('/administrador/os-finalizadas')
    await p.getByRole('main').getByRole('searchbox').fill(MAQUINA.patrimonio)
    await entrarNoSetor(p, LOJA, SETOR)
    await expect(p.getByText('Custo Total: R$ 320,00').first()).toBeVisible()
  })

  test('detalhe da OS traz encerramento, nota e a linha do tempo completa', async () => {
    const p = admin.pagina
    await p.getByRole('button', { name: 'Visualizar OS' }).first().click()
    const m = modal(p)
    await expect(m.getByText('Resistência do forno queimada.')).toBeVisible()
    await expect(m.getByText(`NF${RODADA}`).first()).toBeVisible()
    await expect(m.getByText('Corretiva').first()).toBeVisible()
    await m.getByRole('button', { name: /Histórico/ }).click()
    for (const passo of [/aberta/i, /iniciad/i, /pausad/i, /terceir/i, /retomad/i, /encerrad/i, /custo/i]) {
      await expect(m.getByText(passo).first()).toBeVisible()
    }
    await expect(m.getByText(MOTIVO_PAUSA).first()).toBeVisible()
    await registrar(admin, 'detalhe da OS com histórico')
    await m.getByRole('button', { name: 'Fechar' }).first().click()
  })

  test('imprimir chama a impressão e só sai a OS no papel', async () => {
    const p = admin.pagina
    await p.evaluate(() => {
      ;(window as any).__impressoes = 0
      window.print = () => { (window as any).__impressoes++ }
    })
    await p.getByRole('button', { name: 'Imprimir OS' }).first().click()
    await expect.poll(() => p.evaluate(() => (window as any).__impressoes)).toBeGreaterThan(0)
    await p.emulateMedia({ media: 'print' })
    await expect(p.locator('#area-impressao-os')).toBeVisible()
    await test.info().attach('Admin — prévia de impressão (PDF)', {
      body: await p.pdf({ format: 'A4' }),
      contentType: 'application/pdf',
    })
    await p.emulateMedia({ media: 'screen' })
    await modal(p).getByRole('button', { name: 'Fechar' }).first().click()
  })
})

// Uma das três linhas do card "Custos do mês" (nome, valor e %). O nome abre a linha, por isso
// a âncora: "peças + mão de obra da empresa" também aparece dentro da linha de Terceiros.
function linhaCusto(card: import('@playwright/test').Locator, nome: string) {
  return card.getByRole('listitem').filter({ hasText: new RegExp(`^${nome}`) })
}

function dataBr(iso: string) {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

// GET autenticado com a sessão do próprio aparelho (cookie HttpOnly vai sozinho).
async function api(a: Aparelho, metodo: string, caminho: string, corpo?: unknown) {
  return a.pagina.evaluate(
    async ({ metodo, caminho, corpo }) => {
      const r = await fetch(`/api${caminho}`, {
        method: metodo,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-tenant-ID': location.hostname.split('.')[0] },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
      })
      let json: any = null
      try { json = await r.json() } catch {}
      return { status: r.status, json }
    },
    { metodo, caminho, corpo },
  )
}

test.describe('7. Gestor: histórico, indicadores, OS direta e preventivas', () => {
  test('OS Finalizadas: Loja → Setor → Máquina mostra a OS com o custo corrigido', async () => {
    const p = gestor.pagina
    await p.goto('/painel-gestor?aba=os-finalizadas')
    await entrarNoSetor(p, LOJA, SETOR)
    await p.getByRole('main').getByRole('button', { name: new RegExp(MAQUINA.nome) }).first().click()
    await expect(p.getByText(`#${ids.os}`).first()).toBeVisible()
    await expect(p.getByText('Custo Total: R$ 320,00').first()).toBeVisible()
    await p.getByRole('button', { name: 'Visualizar OS' }).first().click()
    await expect(modal(p).getByText('Resistência do forno queimada.')).toBeVisible()
    await registrar(gestor, 'detalhe da OS finalizada')
    await modal(p).getByRole('button', { name: 'Fechar' }).first().click()
  })

  test('Indicadores da loja somam o custo da OS', async () => {
    const p = gestor.pagina
    await p.goto('/painel-gestor')
    await p.getByRole('button', { name: 'Indicadores' }).click()
    await expect(p).toHaveURL(/dashboard-gestor/)
    await expect(p.getByRole('heading', { name: LOJA })).toBeVisible()
    await expect(p.getByRole('button', { name: /Custo Maquinário.*R\$ 320,00/ })).toBeVisible()
    await registrar(gestor, 'indicadores')
    await p.getByRole('button', { name: /Custo Maquinário/ }).click()
    const lista = modal(p)
    await expect(lista.getByText(`#${ids.os}`).first()).toBeVisible()
    // Modal sobre modal: o detalhe da OS abre por cima da lista, e o Esc fecha só ele.
    await lista.getByText(`#${ids.os}`).first().click()
    await expect(p.locator('[role="dialog"][aria-modal="true"]')).toHaveCount(2)
    await p.keyboard.press('Escape')
    await expect(p.locator('[role="dialog"][aria-modal="true"]')).toHaveCount(1)
    await p.keyboard.press('Escape')
    await expect(p.locator('[role="dialog"][aria-modal="true"]')).toHaveCount(0)
  })

  // O card "Custos do mês" deste gestor só enxerga a Padaria desta rodada, então os números
  // são exatos. Até aqui só a OS do forno foi encerrada, e ela foi para a terceirizada: a fatura
  // inteira (R$ 320,00, já corrigida pelo admin) vai para Terceiros, nada para técnico nem peças.
  test('Custos do mês: a OS terceirizada entra inteira em Terceiros', async () => {
    const p = gestor.pagina
    await p.goto('/painel-gestor')
    const card = p.getByRole('region', { name: 'Custos do mês' })
    await expect(card.getByText('R$ 320,00').first()).toBeVisible()
    await expect(card).toContainText('em 1 OS encerrada')
    await expect(linhaCusto(card, 'Terceiros')).toContainText('R$ 320,00')
    await expect(linhaCusto(card, 'Terceiros')).toContainText('100%')
    await expect(linhaCusto(card, 'Mão de obra dos técnicos')).toContainText('R$ 0,00')
    await expect(linhaCusto(card, 'Peças')).toContainText('R$ 0,00')
    // A OS terceirizada é da empresa: o técnico que a acionou não ganha linha.
    await expect(card.getByRole('button', { name: /Por técnico/ })).toHaveCount(0)
    await registrar(gestor, 'custos do mês só com terceiros')
  })

  test('abre OS direta de pequeno reparo e ela chega no técnico', async () => {
    const p = gestor.pagina
    await p.goto('/painel-gestor')
    await p.getByRole('button', { name: 'Abrir OS', exact: true }).first().click()
    await expect(p).toHaveURL(/abrir-os-direta/)
    await p.getByRole('radio', { name: /Pequenos Reparos/ }).click()
    await registrar(gestor, 'OS direta de reparo')
    await p.getByRole('textbox', { name: /^Item/ }).fill(ITEM_OS_DIRETA)
    await p.getByRole('textbox', { name: /Descrição/ }).fill('Torneira da pia da padaria vazando.')
    await p.getByRole('combobox', { name: 'Setor *' }).selectOption({ label: `${LOJA} · ${SETOR}` })
    await p.getByRole('button', { name: 'Média', exact: true }).click()
    await p.getByRole('main').getByRole('combobox').last().selectOption({ label: `${USUARIOS.tecnico.nome} — Mecânica` })
    await p.getByRole('main').getByRole('button', { name: 'Abrir OS', exact: true }).click()
    await esperarToast(p, /OS #\d+ aberta com sucesso\./)

    const t = tecnico.pagina
    await t.goto('/painel-tecnico')
    await entrarNoSetor(t, LOJA, SETOR)
    await expect(t.getByText(ITEM_OS_DIRETA).first()).toBeVisible()
    await registrar(tecnico, 'OS direta chegou')
  })

  test('o técnico encerra o pequeno reparo com peça e mão de obra', async () => {
    const p = tecnico.pagina
    const card = () =>
      p.getByRole('main').locator('div').filter({ hasText: ITEM_OS_DIRETA }).filter({
        has: p.getByRole('button', { name: /Iniciar Atendimento|Finalizar OS/ }),
      }).last()
    await card().getByRole('button', { name: 'Iniciar Atendimento' }).click()
    await esperarToast(p, /OS #\d+ iniciada\./)
    await card().getByRole('button', { name: 'Finalizar OS' }).click()
    const m = modal(p)
    if ((await m.getByRole('button', { name: /Remover custo/ }).count()) === 0)
      await m.getByRole('button', { name: 'Adicionar custo' }).click()
    await m.getByRole('textbox', { name: 'Descrição *', exact: true }).first().fill('Troca do reparo da torneira')
    await m.getByRole('spinbutton', { name: 'Valor Peças (R$) *' }).first().fill('30')
    await m.getByRole('spinbutton', { name: 'Valor Mão de Obra (R$)' }).first().fill('60')
    await m.getByRole('combobox', { name: 'Tipo de OS *' }).selectOption('Predial')
    await m.getByRole('textbox', { name: 'Defeito Constatado *' }).fill('Reparo da torneira gasto, pingando sem parar.')
    await m.getByRole('textbox', { name: 'Causa Raiz *' }).fill('Desgaste natural da borracha de vedação.')
    await m.getByRole('textbox', { name: 'Solução Aplicada *' }).fill('Reparo trocado e torneira testada sem vazamento.')
    await m.getByRole('button', { name: 'Encerrar OS' }).click()
    await esperarToast(p, /OS #\d+ encerrada com sucesso\./)
  })

  // Agora há uma OS feita pelo técnico (60 de mão de obra + 30 de peça) ao lado da terceirizada:
  // as três parcelas somam o total, e a lista por técnico mostra só a OS que ele fez.
  test('Custos do mês: mão de obra, terceiros e peças somam o total, com a lista por técnico', async () => {
    const p = gestor.pagina
    await p.goto('/painel-gestor')
    const card = p.getByRole('region', { name: 'Custos do mês' })
    await expect(card.getByText('R$ 410,00').first()).toBeVisible()
    await expect(card).toContainText('em 2 OS encerradas')
    await expect(linhaCusto(card, 'Mão de obra dos técnicos')).toContainText('R$ 60,00')
    await expect(linhaCusto(card, 'Terceiros')).toContainText('R$ 320,00')
    await expect(linhaCusto(card, 'Terceiros')).toContainText('1 OS')
    await expect(linhaCusto(card, 'Peças')).toContainText('R$ 30,00')

    const porTecnico = card.getByRole('button', { name: 'Por técnico (1)' })
    await expect(porTecnico).toHaveAttribute('aria-expanded', 'false')
    await porTecnico.click()
    await expect(porTecnico).toHaveAttribute('aria-expanded', 'true')
    const linha = card.getByRole('listitem').filter({ hasText: USUARIOS.tecnico.nome })
    await expect(linha).toContainText('R$ 60,00')
    await expect(linha).toContainText('1 OS')
    await registrar(gestor, 'custos do mês com a lista por técnico')
  })

  test('Custos do mês: o mês passado vem vazio e não dá para ir além do mês atual', async () => {
    const card = gestor.pagina.getByRole('region', { name: 'Custos do mês' })
    await expect(card.getByRole('button', { name: 'Próximo mês' })).toBeDisabled()
    await card.getByRole('button', { name: 'Mês anterior' }).click()
    await expect(card.getByText('Nenhuma OS encerrada neste mês.')).toBeVisible()
    await card.getByRole('button', { name: 'Próximo mês' }).click()
    await expect(card.getByText('R$ 410,00').first()).toBeVisible()
  })

  test('aba de preventivas: Loja → Setor → Máquina mostra a preventiva', async () => {
    const p = gestor.pagina
    await p.goto('/painel-gestor?aba=manutencao-preventiva')
    await entrarNoSetor(p, LOJA, SETOR)
    await p.getByRole('main').getByRole('button', { name: new RegExp(MAQUINA.nome) }).first().click()
    await expect(p.getByText('Limpeza do queimador e troca da vedação da porta').first()).toBeVisible()
    await registrar(gestor, 'preventivas')
  })

  test('a data da preventiva aparece como foi cadastrada', async () => {
    await expect(gestor.pagina.getByText(`Próxima: ${dataBr(hojeIso())}`).first()).toBeVisible()
  })

  test('salvar a máquina sem mudar nada não mexe na data nem no id da preventiva', async () => {
    const doForno = async () =>
      ((await api(admin, 'GET', '/preventivas')).json as any[]).find((x) => x.maquinaNome === MAQUINA.nome)
    const antes = await doForno()
    const p = admin.pagina
    await p.goto('/administrador/maquinas')
    await p.getByRole('main').getByRole('searchbox').fill(MAQUINA.patrimonio)
    await p.getByRole('main').getByRole('button', { name: /Editar/ }).first().click()
    await expect(p.getByRole('textbox', { name: 'Nome *' })).toHaveValue(MAQUINA.nome)
    await expect(p.getByText(`Próxima: ${dataBr(hojeIso())}`)).toBeVisible()
    await p.getByRole('button', { name: /Salvar|Atualizar/ }).last().click()
    await esperarToast(p, 'Máquina atualizada com sucesso.')
    const depois = await doForno()
    expect(depois.proximaData).toBe(`${dataBr(hojeIso())} 00:00:00`)
    // Mesmo id: é ele que segura o histórico de ciclos da preventiva.
    expect(depois.id).toBe(antes.id)
    expect((await api(admin, 'GET', `/preventivas/${depois.id}/historico`)).status).toBe(200)
  })
})

test.describe('8. Permissões e isolamento', () => {
  test('cada perfil que tenta abrir tela de outro volta para a sua', async () => {
    for (const [a, alheia, propria] of [
      [solicitante, '/painel-administrador', /home-solicitante/],
      [solicitante, '/painel-gestor', /home-solicitante/],
      [tecnico, '/painel-gestor', /painel-tecnico/],
      [tecnico, '/administrador/usuarios', /painel-tecnico/],
      [gestor, '/cadastrar-usuario', /painel-gestor/],
      [gestor, '/administrador/custos-pendentes', /painel-gestor/],
    ] as const) {
      await a.pagina.goto(alheia)
      await expect(a.pagina, `${a.nome} em ${alheia}`).toHaveURL(propria)
    }
  })

  test('a API recusa com 403 o que o perfil não pode fazer', async () => {
    expect((await api(solicitante, 'GET', '/usuarios')).status).toBe(403)
    expect((await api(solicitante, 'GET', '/ordens-servico')).status).toBe(403)
    expect((await api(tecnico, 'POST', `/solicitacoes/${ids.solicitacaoMaquina}/abrir-os`, { urgencia: 3, tecnicoId: 1 })).status).toBe(403)
    expect((await api(gestor, 'POST', '/lojas', { nome: 'Invasora' })).status).toBe(403)
    expect((await api(gestor, 'POST', `/ordens-servico/${ids.os}/custo`, {})).status).toBe(403)
  })

  test('o gestor da Padaria não lê a solicitação do Açougue nem por id', async () => {
    const todas = (await api(admin, 'GET', '/solicitacoes')).json as any[]
    const doAcougue = todas.find((s) => s.itemDescricao === ITEM_REPARO_ACOUGUE)
    expect(doAcougue, 'admin vê a solicitação do Açougue').toBeTruthy()
    expect((await api(gestor, 'GET', `/solicitacoes/${doAcougue.id}`)).status).toBe(404)
    expect((await api(solicitante, 'GET', `/solicitacoes/${doAcougue.id}`)).status).toBe(404)
  })

  test('o header X-tenant-ID não troca de empresa depois do login', async () => {
    const r = await admin.pagina.evaluate(async () => {
      const res = await fetch('/api/lojas', { credentials: 'include', headers: { 'X-tenant-ID': 'demo' } })
      return (await res.json()) as { nome: string }[]
    })
    expect(r.some((l) => l.nome === LOJA)).toBeTruthy()
    expect(r.every((l) => l.nome.startsWith('Loja E2E'))).toBeTruthy()
  })

  test('as credenciais do tenant teste não entram no tenant demo', async () => {
    const r = await admin.pagina.evaluate(async (senha) => {
      const res = await fetch('/api/autenticacao/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-tenant-ID': 'demo' },
        body: JSON.stringify({ email: 'admin@teste.com', senha }),
      })
      return res.status
    }, SENHA)
    expect([400, 401, 404]).toContain(r)
    // O login recusado não pode ter derrubado nem trocado a sessão do admin.
    expect((await api(admin, 'GET', '/autenticacao/sessao')).json.email).toBe('admin@teste.com')
  })
})

test.describe('9. Sessão guardada no banco', () => {
  test('depois de Sair, uma cópia do cookie não vale mais', async ({ browser }) => {
    const copia = await criarAparelho(browser, 'Cópia do cookie', 'android')
    await entrar(copia, USUARIOS.tecnico.email)
    const cookies = await copia.contexto.cookies()
    await sair(copia)
    const outro = await browser.newContext()
    await outro.addCookies(cookies)
    const pg = await outro.newPage()
    await pg.goto('/login')
    const status = await pg.evaluate(async () =>
      (await fetch('/api/autenticacao/sessao', { credentials: 'include', headers: { 'X-tenant-ID': 'teste' } })).status,
    )
    expect(status).toBe(401)
    await outro.close()
    await copia.contexto.close()
  })

  test('usuário excluído pelo admin cai na hora no aparelho dele', async ({ browser }) => {
    const celular = await criarAparelho(browser, 'Solicitante Açougue (Android)', 'android')
    await entrar(celular, USUARIOS.solicitanteAcougue.email)
    await expect(celular.pagina).toHaveURL(/home-solicitante/)

    const p = admin.pagina
    await p.goto('/administrador/usuarios')
    await p.getByRole('main').getByRole('searchbox').fill(USUARIOS.solicitanteAcougue.email)
    await expect(p.getByText(USUARIOS.solicitanteAcougue.email)).toBeVisible()
    await p.getByRole('button', { name: 'Excluir usuário' }).first().click()
    await modal(p).getByRole('button', { name: 'Excluir' }).click()
    await esperarToast(p, 'Usuário excluído com sucesso.')

    await celular.pagina.getByRole('button', { name: /Minhas Solicitações/ }).click()
    await expect(celular.pagina).toHaveURL(/\/login/)
    await registrar(celular, 'derrubado depois de excluído')
    await celular.contexto.close()
  })
})

test.describe('10. Aviso no celular (Web Push)', () => {
  // Push precisa do Chromium completo e de perfil persistente: o headless shell ignora a
  // permissão e o Chrome não tem Push API em contexto anônimo (que é o padrão do Playwright).
  let celular: BrowserContext
  let p: Page
  let corpoInscricao: any = null

  test.beforeAll(async () => {
    const { defaultBrowserType, ...pixel } = devices['Pixel 7']
    celular = await chromium.launchPersistentContext(test.info().outputPath('perfil-push'), {
      channel: 'chromium',
      ...pixel,
      permissions: ['notifications'],
      baseURL: test.info().project.use.baseURL,
    })
    p = celular.pages()[0] ?? (await celular.newPage())
    await p.goto('/login')
    await p.getByPlaceholder('seu@email.com').fill(USUARIOS.tecnico.email)
    await p.locator('input[type=password]').fill(SENHA)
    await p.getByRole('button', { name: 'Entrar' }).click()
    await p.waitForURL(/painel-tecnico/)
  })

  test.afterAll(async () => celular?.close())

  test('o técnico ativa e o app manda a inscrição do navegador para o servidor', async () => {
    const sino = await abrirSino(p)
    await expect(sino.getByText('Receber avisos neste aparelho')).toBeVisible()
    // O Chromium de teste usa o endpoint jmt17.google.com, que o servidor (com razão) não
    // aceita -- só os serviços dos navegadores reais. Aqui confere o que sai do app.
    const pedido = p.waitForRequest((r) => r.url().includes('/api/push/inscricoes') && r.method() === 'POST')
    await sino.getByRole('button', { name: 'Ativar' }).click()
    corpoInscricao = (await pedido).postDataJSON()
    expect(corpoInscricao.endpoint).toMatch(/^https:\/\//)
    expect(corpoInscricao.keys.p256dh).toBeTruthy()
    expect(corpoInscricao.keys.auth).toBeTruthy()
  })

  test('servidor recusou a inscrição: a tela volta para "Ativar" em vez de dizer que está ativo', async () => {
    const sino = p.getByRole('dialog', { name: 'Notificações' })
    await expect(sino.getByRole('button', { name: 'Ativar' })).toBeVisible()
    await test.info().attach('Técnico (Chromium) — sininho depois do 400', {
      body: await p.screenshot(),
      contentType: 'image/png',
    })
    await expect(sino.getByText('Avisos ativos neste aparelho')).toHaveCount(0)
    // E o navegador também desfez: senão o próximo login reenviaria a inscrição recusada.
    expect(await p.evaluate(async () => !!(await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription()))).toBe(false)
  })
})

test.describe('11. Verificação final', () => {
  test('nenhum erro 5xx nem erro de console nos 4 aparelhos', async () => {
    const todos = [admin, gestor, tecnico, solicitante]
    const resumo = todos.map((a) => `## ${a.nome}\n${a.problemas.join('\n') || '(nada)'}`).join('\n\n')
    await test.info().attach('problemas por aparelho', { body: resumo, contentType: 'text/plain' })
    await test.info().attach('erros provocados (rede cortada, nota repetida)', {
      body: provocados.join('\n') || '(nada)',
      contentType: 'text/plain',
    })
    const graves = todos.flatMap((a) =>
      a.problemas.filter((x) => /\[http 5\d\d\]|\[console\]|\[exceção\]|\[layout\]/.test(x)).map((x) => `${a.nome}: ${x}`),
    )
    expect(graves, graves.join('\n')).toEqual([])
  })
})
