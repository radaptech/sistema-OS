# Sistema OS

Sistema para acompanhar a manutenção de máquinas: o Solicitante abre o pedido pelo celular,
o Gestor aprova e abre a OS, o Técnico executa e o Administrador confere o custo.

| pasta | o que é |
|---|---|
| `sistema-OSm--Back-end/` | API em Go (Gin + sqlc + Postgres), multi-tenant por subdomínio |
| `sistema-OSm--Front-end/` | React + Vite, PWA instalável, mobile-first |
| `e2e/` | testes ponta a ponta com Playwright (4 aparelhos ao mesmo tempo) |
| `docker-compose.yml` | ambiente local: Postgres, api, front e traefik |

Cada pasta tem o próprio `CLAUDE.md`/`README.md` com os detalhes.

## Rodar local

```sh
make init          # build + sobe o compose
# http://<tenant>.localhost:8090
```

Cada app lê o próprio `.env` (fora do git): modelos em `sistema-OSm--Back-end/.env-example` e `sistema-OSm--Front-end/.env.example`.

## Testes

```sh
cd sistema-OSm--Back-end && go test -race ./...   # com o compose de pé
cd sistema-OSm--Front-end && npm run build
cd e2e && npx playwright test                     # ver e2e/README.md
```

O CI roda o back e o front separados (`.github/workflows/`), cada um só quando a pasta dele muda.

## Histórico

Este repositório junta três que existiam antes, com o histórico completo de cada um:
`radaptech/sistema-os-infra` (raiz), `radaptech/sistema-OSm--Back-end` e
`radaptech/sistema-OSm--Front-end` (importados com `git subtree`). PRs e issues antigos
continuam lá.
