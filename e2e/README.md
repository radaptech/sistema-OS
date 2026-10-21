# Testes ponta a ponta (4 aparelhos)

Roda o fluxo inteiro contra o compose local (`http://teste.localhost:8090`), com quatro
navegadores isolados ao mesmo tempo: Solicitante (iPhone) e Técnico (Android) no celular,
Gestor (1366px) e Administrador (1920px) no desktop.

Cada rodada cria os próprios cadastros com um sufixo novo, então dá para rodar quantas vezes
quiser no mesmo tenant.

## Primeira vez

```sh
# o tenant de teste (uma vez só por banco)
docker exec api_sistema-OS ./main provisionar-admin -subdominio=teste -empresa='Empresa Teste' \
  -nome='Admin Teste' -email=admin@teste.com -senha=Teste@123

cd e2e && npm install && npx playwright install chromium
```

## Rodar

```sh
npx playwright test              # a rodada completa (~2,5 min)
npx playwright show-report       # relatório com a captura de cada passo, por aparelho
E2E_EMAIL=1 npx playwright test email   # manda o e-mail de recuperação DE VERDADE (Resend)
```

## Como ler o resultado

- Tudo verde é tudo funcionando. Os testes que cortam a rede ou mandam nota repetida provocam
  erro de propósito, e o rastro deles vai para o anexo "erros provocados", fora da conta.
- O último passo falha se aparecer resposta 5xx, erro de console, exceção solta no navegador
  ou rolagem lateral em tela de celular, em qualquer dos quatro aparelhos.
- Bug achado e ainda não corrigido entra como `test.fail(true, 'motivo')` com o título
  começando em **BUG:** — o teste descreve o comportamento certo, aparece como falha
  esperada e acusa "passou inesperadamente" quando o bug for corrigido.

## Limitações

- WebKit precisa de pacotes de sistema que esta máquina não tem: o "iPhone" é o Chromium com a
  tela, o toque e o user-agent do iPhone, não o Safari.
- Push: o teste confere a ativação e o que o app manda ao servidor, mas o Chromium de teste usa
  um serviço de push (`jmt17.google.com`) que o back recusa de propósito. Entrega real só no
  celular.
- O job de preventivas vencidas não roda aqui: ele varre **todos** os tenants do banco.

`explorar.mjs` é a ferramenta usada para escrever os testes (loga, abre uma rota e imprime a
árvore de acessibilidade); não faz parte da rodada.
