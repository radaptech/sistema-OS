# Histórico de verificações pelo navegador

Registro do que foi percorrido em tela e quando. As pegadinhas que ainda valem estão no `CLAUDE.md` da raiz; aqui fica a narrativa.

## Repaginação visual (03/09/2026) — o que foi visto em tela

- **Verificado no navegador** (build com `VITE_USE_MOCKS=true` + `vite preview`): login e
  `PainelGestor` com cards, badges, filtros, select e barra superior. As telas de cadastro e
  as do Administrador **não foram vistas em tela** nessa passagem — a sessão mock reconduzia
  para o painel do Gestor a cada troca de perfil. Elas usam os mesmos componentes já
  conferidos, mas isso é inferência, não verificação.

## Verificação pelo navegador (07/09/2026) — custo por tarefa e login sem perfil

Percorrido em modo mock (`VITE_USE_MOCKS=true`), nas duas telas que escrevem custo e no login.

- **Encerramento (Técnico):** lançadas três tarefas na mesma OS de maquinário, o total somou
  ao vivo, e a OS encerrou. Depois o caso que motivou a mudança de forma: duas peças
  (`rolamento` e `serra fita`) **sem nenhuma hora técnica** — antes o formulário bloqueava
  com "OS de maquinário exige ao menos um custo de hora do técnico"; agora encerra.
- **Custos Pendentes (Administrador):** o modal abre com a itemização do Técnico
  pré-preenchida, o alternador de nota revela a lista, e duas notas (uma com série, outra
  sem) persistiram — o card passou a exibir as duas e a OS trocou para a pílula "Revisadas".
- **Login:** sem o seletor, `tecnico@demo.com` cai em `/painel-tecnico` e
  `administrador@demo.com` em `/painel-administrador`, os dois só com e-mail e senha. Senha
  errada devolve "E-mail ou senha inválidos", sem citar perfil.
- ⚠️ **Achado que só apareceu na tela:** o modal do Administrador não tinha teto de altura
  (até aqui cabiam dois campos numéricos ali) e o cartão passava da tela com as duas listas.
  Corrigido com `max-h-[75vh]` + rodapé `sticky` nos dois modais — ver item 12.

## Verificação pelo navegador (22/08/2026)

Os cinco cadastros do Administrador foram percorridos **na tela, contra a API real** (não
mock, não curl): login, lojas, setores em cascata, os perfis de usuário com escopo, máquina
com foto (multipart → R2 → URL assinada renderizando no `<img>`), preventiva com data e
empresa terceirizada. Tudo passou. Os bugs abaixo foram achados **nessa passagem** e já
estão corrigidos — não reintroduza.

**Resolvido (23/08/2026 → devolvido em 05/09/2026):** os cards "Custos Pendentes" e "OS
Finalizadas" tinham sido removidos da Home do Painel porque chamavam `/ordens-servico`,
que não existia no back (o admin clicava e recebia toast de erro) — as telas
(`AdministradorCustosPendentes`, `AdministradorOSFinalizadas`) e as rotas em
`RotasPrincipais.tsx` continuaram intactas o tempo todo, só o ponto de entrada tinha saído.
Voltaram quando o back-end ganhou o ciclo de vida completo da Ordem de Serviço
(`iniciar`/`pausar`/`retomar`/`acionar-terceiro`/`encerrar`/`custo` —
`radaptech/sistema-OSm--Back-end`, `docs/fluxo-de-negocio.md`), em especial
`POST /ordens-servico/:id/custo`, que é quem os dois cards precisavam pra funcionar de
verdade.

Verificado contra a API real (não mock, não `go test`): tenant `smoke`, login como
Administrador, `GET /ordens-servico?status=Concluída` achando uma OS de terceiros com
custo já lançado pelo Técnico, `POST /custo` corrigindo o valor e anexando nota fiscal —
resposta 200, `lancadoPorNome` trocando de dono, e a linha conferida direto no Postgres
(`select ... from os_custo`). As travas também testadas ao vivo: `custoHoraTecnico` numa
OS de terceiros devolve 400, OS inexistente 404, sem sessão 401.

**Não existe `AdministradorTecnicos`** (nem pasta, nem card, nem rota), apesar de o item 12
descrever a tela. `GET /tecnicos` já existe no back e hoje só alimenta o
`ModalAbrirOrdemServico`; `servicoTecnicos.obterPorId` não é chamado por ninguém.

## Web Push (13/10/2026) — push de verdade, contra a API real

Percorrido no Chrome desktop em `demo.localhost:8090` (compose local: back real com o par
VAPID de dev, front em `vite dev`). `*.localhost` é contexto seguro, então o push passa pelo
FCM de verdade — não é simulação.

- **Ativar:** o técnico abre o sininho, "Ativar", o Chrome pede permissão, e a linha aparece em
  `dispositivo_push` (endpoint FCM, dono = técnico). O painel troca o botão pela linha "Avisos
  ativos neste aparelho".
- **Push:** o gestor abre uma OS pro técnico (via API) e ~1s depois a notificação aparece no
  desktop — título, corpo, `badge-96.png`, `tag notificacao-<id>` e url `/painel-tecnico?os=N`
  conferidos em `registration.getNotifications()`. A aba aberta busca a contagem e a lista
  sozinha (mensagem `PUSH_RECEBIDO`), e o sininho mostra 1.
- **Toque com o app aberto:** a aba vem pra frente, `POST /notificacoes/:id/lida`, o detalhe da
  OS abre e o `?os=` sai da URL.
- **Caminho do app fechado:** abrir `/painel-tecnico?os=N&notificacao=<id>` (a URL que o
  `openWindow` monta) marca como lida, abre o detalhe e a URL fica limpa. O `openWindow` em si
  não foi exercitado.
- **Reload:** reenvia a inscrição (`POST /push/inscricoes` 204). Tudo lido → bandeja vazia.
- **Logout:** `POST /push/inscricoes/remover` antes do `/autenticacao/logout`, inscrição sumiu do
  navegador e do banco. Novo login mostra "Ativar" de novo (não reinscreve sozinho).
- **Largura mínima do Chrome (619px):** painel em largura cheia, sem rolagem lateral.
- ⚠️ **Achado na tela:** com "Ativando..." o botão alargava e quebrava o título em duas linhas
  — o botão ganhou largura fixa (`w-24`).
- **Não visto:** celular real (Android/iPhone — precisa de HTTPS), telas `bloqueado` e
  `instalar`, modo mock no navegador.

