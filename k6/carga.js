// Teste de carga: 4 perfis abrindo os painéis como na vida real, subindo até 50
// usuários simultâneos. Roda contra o compose local, NUNCA contra produção.
//
//   docker run --rm -i --network host -e TENANT=teste -v "$PWD/k6:/k6" grafana/k6:1.4.2 run -e SUFIXO=flr83 /k6/carga.js
//
// Login só no setup (4 logins): o /login aceita 5 por IP e depois 1 a cada 12s,
// de propósito. Escrita é OS direta (JSON): solicitação de verdade sobe foto pro R2.
import http from 'k6/http'
import { check, sleep, group } from 'k6'

const BASE = __ENV.BASE || 'http://127.0.0.1:8090/api'
const TENANT = __ENV.TENANT || 'teste'
const SENHA = __ENV.SENHA || 'Teste@123'
const SEMEAR = Number(__ENV.SEMEAR || 200) // OS criadas antes, pra lista não ficar vazia
const PICO = Number(__ENV.PICO || 50)

export const options = {
  setupTimeout: '5m',
  scenarios: {
    paineis: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: PICO },
        { duration: '2m', target: PICO },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
}

// Host aponta o Traefik pro front/API do tenant sem depender de *.localhost resolver.
const cabecalhos = (cookie) => ({
  Host: `${TENANT}.localhost`,
  'X-tenant-ID': TENANT,
  'Content-Type': 'application/json',
  ...(cookie ? { Cookie: `token=${cookie}` } : {}),
})

function entrar(email) {
  const r = http.post(`${BASE}/autenticacao/login`, JSON.stringify({ email, senha: SENHA }), {
    headers: cabecalhos(),
  })
  // O cookie é Secure e aqui é http: o jar do k6 não reenviaria, então vai no header.
  const token = r.cookies.token && r.cookies.token[0].value
  if (r.status !== 200 || !token) throw new Error(`login ${email}: ${r.status} ${r.body}`)
  return { token, sessao: r.json() }
}

const get = (u, path, nome) =>
  http.get(`${BASE}${path}`, { headers: cabecalhos(u.token), tags: { name: nome || path } })

export function setup() {
  const sufixo = __ENV.SUFIXO
  if (!sufixo) throw new Error('passe -e SUFIXO=<rodada do e2e> (ex: flr83)')
  const u = {}
  for (const p of ['solicitante', 'tecnico', 'gestor']) u[p] = entrar(`${p}.${sufixo}@teste.com`)
  u.administrador = entrar('admin@teste.com')

  const g = u.gestor
  // Setor tem de estar no escopo do gestor, senão a OS direta volta 400.
  const escopo = g.sessao.escoposGestor[0]
  const setores = get(g, `/setores?lojaId=${escopo.lojaId}`).json()
  const setor =
    escopo.setoresIds === 'todos' ? setores[0] : setores.find((s) => escopo.setoresIds.includes(s.id))
  const tecnico = get(g, `/tecnicos?lojaId=${escopo.lojaId}`).json()[0]
  const base = { tipo: 'reparo', setorId: setor.id, urgencia: 'Média', tecnicoId: tecnico.id }

  for (let i = 0; i < SEMEAR; i++) {
    const r = http.post(
      `${BASE}/solicitacoes/direta`,
      JSON.stringify({ ...base, item: `Carga ${i}`, descricao: 'semeado pelo k6' }),
      { headers: cabecalhos(g.token) },
    )
    if (r.status !== 201) throw new Error(`semear: ${r.status} ${r.body}`)
  }
  return { u, base, lojaId: setor.lojaId, tecnicoId: tecnico.id }
}

const PERFIS = ['solicitante', 'tecnico', 'gestor', 'administrador']

export default function (d) {
  const perfil = PERFIS[__VU % 4]
  const u = d.u[perfil]
  const ok = (r) => check(r, { '2xx': (x) => x.status >= 200 && x.status < 300 })

  group(perfil, () => {
    // O que todo painel busca ao abrir.
    ok(get(u, '/autenticacao/sessao'))
    ok(get(u, '/notificacoes/nao-lidas'))

    if (perfil === 'solicitante') {
      ok(get(u, '/solicitacoes/minhas'))
      ok(get(u, '/solicitacoes/minhas/maquinas'))
    } else if (perfil === 'tecnico') {
      ok(get(u, `/ordens-servico?tecnicoId=${d.tecnicoId}&finalizada=false`, '/ordens-servico (técnico)'))
    } else if (perfil === 'gestor') {
      ok(get(u, '/solicitacoes/resumo'))
      ok(get(u, '/ordens-servico/resumo'))
      ok(get(u, `/indicadores/lojas/${d.lojaId}`, '/indicadores/lojas/:id'))
      ok(get(u, '/indicadores/custos'))
      // 1 em cada 10 visitas abre uma OS direta: o caminho de escrita.
      if (Math.random() < 0.1) {
        ok(
          http.post(
            `${BASE}/solicitacoes/direta`,
            JSON.stringify({ ...d.base, item: `Carga VU${__VU}`, descricao: 'k6' }),
            { headers: cabecalhos(u.token), tags: { name: 'POST /solicitacoes/direta' } },
          ),
        )
      }
    } else {
      ok(get(u, '/usuarios'))
      ok(get(u, '/lojas'))
      ok(get(u, '/maquinas'))
      ok(get(u, '/ordens-servico/resumo?finalizada=true', '/ordens-servico/resumo (finalizadas)'))
    }
  })

  sleep(3 + Math.random() * 5) // lendo a tela antes do próximo clique
}
