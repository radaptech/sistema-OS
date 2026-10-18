# Contexto do Projeto - Front-end (EPI SaaS / Solicitação OS)

## Regra de Autonomia Absoluta
- **Execução Direta:** Nunca peça confirmações óbvias, validações intermediárias ou permissões para prosseguir com o que foi solicitado. Se o comando foi dado, execute a tarefa por completo, gere o código necessário de ponta a ponta e apresente o resultado final de forma autônoma.

## Regra de Integração e Navegação Real
- **Aplicação Real, Integrada ao Back-end:** Nenhuma tela deve ser tratada como um componente isolado ou estático. Todas as telas DEVEM ser interligadas de verdade através do React Router DOM, permitindo a navegação completa de ponta a ponta (ex: clicar em "Minhas Solicitações" na Home direciona para a tela de listagem, clicar em "Nova OS" abre o formulário, etc.).
- **Modo mock alternável (REGRA ATUAL):** o back-end ainda não está sempre disponível para desenvolver/demonstrar o front, então o projeto tem um modo mock que se liga/desliga por variável de ambiente — ver "Modo Mock (`src/mocks/`)" abaixo. Nenhum `servico*.ts` sabe se está em modo mock: todos continuam chamando só `api.ts`, exatamente como antes. Se um endpoint ainda não existe no back-end real, defina o contrato aqui, no serviço **e** no mock correspondente (`src/mocks/rotas/`).
- **Estado de Autenticação:** a sessão vem do servidor (cookie HttpOnly) e é espelhada num estado global leve (Zustand, `useEstadoAutenticacao`) apenas para leitura pelas telas — o front **não deriva** perfil, escopo de acesso, loja, setor ou `tecnicoId`; tudo isso chega pronto no payload de `/autenticacao/login` e `/autenticacao/sessao`.

## Modo Mock (`src/mocks/`)
- **Flag:** `VITE_USE_MOCKS=true` no `.env` (ver `.env.example`) troca, dentro de `requisitar()` em `src/servicos/api.ts`, a chamada real a `fetch()` por `simularFetch()` (`src/mocks/apiMock.ts`) — só essa chamada muda; todo o resto de `api.ts` (parsing JSON/Blob, erro 401, toast) é reaproveitado sem duplicação, porque `simularFetch` devolve um `Response` de verdade (`new Response(...)`). Para voltar à API real, basta `VITE_USE_MOCKS=false` (ou remover a variável) — nenhum código precisa ser revertido.
- **"Banco" em memória (`bancoMock.ts`):** coleções mutáveis (empresas, lojas, setores, usuários — inclusive Técnico, mesma tabela — máquinas, preventivas, empresas terceirizadas, solicitações, ordens de serviço) com um seed inicial cobrindo os 4 perfis. Reseta a cada reload da página. `historicoMock.ts` acrescenta 12 meses de OS concluídas (máquinas 1–4, datas relativas a hoje) para o gráfico de custo mensal do `DashboardGestor` ter o que mostrar. Login de demonstração: `solicitante@demo.com`, `tecnico@demo.com`, `gestor@demo.com`, `administrador@demo.com`, todos com senha `123456`.
- **Sessão mock:** sem cookie real, o "usuário logado" fica em `sessionStorage` (sobrevive a reload da aba, cai ao fechar) — mesmo efeito prático da restauração via `PortaoSessao`/`useSessao`.
- **Regras de negócio replicadas (`regrasMock.ts`):** preventiva vencida → solicitação automática (`origem: 'preventiva'`, mesmo mecanismo do antigo `gerarSolicitacoesPreventivasVencidas`), ciclo de vida completo da OS (iniciar/pausar/retomar/acionar-terceiro/encerrar/custo), cálculo de Horas Trabalhadas/Parada, `finalizada`, escopo por perfil (Gestor por `escoposGestor`, Técnico pelo próprio `tecnicoId`) e indicadores de máquina computados do histórico real de OS `Concluída` no banco mock — nada é mais um valor fixo por máquina. `somarItensDeCusto` replica a regra do servidor de somar as tarefas em vez de aceitar um total do cliente: sem ela o modo mock inventaria uma segunda aritmética de custo, e a tela passaria em mock e falharia contra a API real.
- **Rotas (`src/mocks/rotas/*.ts`):** um arquivo por domínio, mesma divisão de `servico*.ts`, cada um exportando uma lista de `{ metodo, padrao, tratar }` casada contra `endpoint` em `apiMock.ts`. Ao adicionar um endpoint novo num serviço real, adicione o par correspondente aqui.
- **Notificações (`notificacoesMock.ts`):** a coleção do sininho + os mesmos 6 eventos do servidor (quem recebe, texto e url iguais), chamados dos handlers de solicitação/OS e de `sincronizarPreventivasVencidas`. `semearNotificacoes()` (chamado por `rotas/notificacoes.ts`, nunca no topo do módulo — há um ciclo de import inofensivo com `regrasMock`) gera as do seed, pra cada perfil de demonstração já abrir com o sininho preenchido.
- **Upload nos dois modos:** os handlers mock de `maquinas`/`solicitacoes` detectam `FormData`, leem a parte `dados` (JSON) e viram a `foto`/`video` recebidos em `URL.createObjectURL(...)` — visualizável durante a sessão, sem upload real.

## Tech Stack
- **Mobile-First obrigatório.** HTTP só pelo wrapper nativo `api.ts` (Fetch) — não adicione Axios. O resto da stack está no `package.json`.

## Identidade Visual (Design Tokens)
Definidos em `tailwind.config.ts` e usados em toda a aplicação — não hardcode cores/hex nas telas.
- **Superfície (base de tudo):** aplicação em fundo claro (`bg-slate-50`). Conteúdo em cartão branco delimitado por linha fina, nunca cartão branco flutuando sobre fundo escuro. Seções internas usam a superfície tingida `bg-slate-50/50` + `border-slate-200/60` + `rounded-2xl`. **Não use `bg-slate-600`/`bg-slate-700` como fundo de página ou de bloco** — foi removido de todas as telas e volta a quebrar contraste de texto se reintroduzido.
- **Paleta `marca`:** `marca-950` `#0f2916` → `marca-100` `#e4f6e9`. Botões primários e estado ativo de aba/filtro usam **verde sólido** `bg-marca-600` com sombra colorida tênue (`shadow-sm shadow-marca-600/20`). **Não use gradiente da marca em botão ou cabeçalho** — sobre fundo claro o gradiente escurece uma das pontas e desequilibra o peso do elemento. Gradiente ficou restrito a varreduras de skeleton.
- **Controles:** altura fixa `h-[46px]` + `rounded-xl` + `border-slate-200/60` + fundo branco em todo input, select e botão. Altura fixa, e não padding: o campo convive lado a lado com botões e selects, e alinhar por padding desalinha assim que o tamanho do texto muda. Rótulo de campo é `text-[10px] font-bold tracking-widest uppercase text-slate-500`.
- **Fontes:** `font-display` (Big Shoulders — títulos), `font-sans` (IBM Plex Sans — corpo, padrão no `body`), `font-mono` (IBM Plex Mono — rótulos em caixa alta, códigos, e-mails, rodapés).
- **Sombras:** `shadow-card`, `shadow-card-hover` (cards e listagens), `shadow-pop` (modais). **O primeiro valor de cada uma é um anel de 1px**, que é a borda fina do cartão chegando por `box-shadow` — assim ela não entra no cálculo de layout e não desloca nada. É o ponto único de ajuste do peso das superfícies: mexa no token, não em cada tela.
- **Textura:** `bg-grade-industrial` + `bg-grade` (grade sutil). Sem uso desde que cabeçalhos e login deixaram de ter gradiente — mantida no config para blocos de cor cheia.
- **Animações:** ver **`docs/principios-de-motion.md`** — leia antes de adicionar qualquer movimento. Resumo: ponderação Emil Kowalski (sistema de produtividade → rápido e discreto), nada acima de 300ms, só `transform`/`opacity`/`filter`, curvas próprias (`ease-entrada`/`ease-saida`/`ease-painel`) em vez de `ease` cru, saída sempre mais fraca que a entrada. Classes: `animate-fade-in`/`animate-pop-in` (entrada de modal), `animate-fade-out`/`animate-pop-out` (saída), `animate-surgir` (entrada de conteúdo em lista), `animate-varrer` (skeleton).
- **Carregamento:** skeleton no formato do conteúdo (`componentes/Esqueleto.tsx`) em vez de texto "Carregando..."; rotas em `React.lazy` com fallback que só aparece após 150ms (`CarregandoRota`); imagens via `ImagemProgressiva` (`loading="lazy"` + fade); `Botao` com prop `carregando` nas mutações.
- **Tema escuro (`index.css`, `AlternadorTema`):** nenhuma tela tem classe `dark:`. No Tailwind v4 `bg-white`/`bg-slate-*` resolvem para `var(--color-*)`, então o bloco `:root[data-tema='escuro']` em `index.css` reescreve os neutros e os tingidos (`*-50`/`*-100`) e vira o sistema inteiro de uma vez. Duas exceções ficam como override de classe no mesmo bloco: (1) tokens de papel duplo (`text-white` sobre botão de cor cheia, `text-*-700` sobre badge tingido) e (2) a paleta `marca`, que vem do `tailwind.config.ts` e o Tailwind v4 escreve como hex literal, não como variável — `bg-marca-100`, `text-marca-900`. **Ao criar tela nova não escreva `dark:`**: use os tokens do sistema (`bg-white`, `bg-slate-50`, `text-slate-*`) e o tema sai de graça. O bloco todo vive dentro de `@media screen` para a impressão de OS sair sempre clara. A preferência é decidida no `index.html` antes da primeira pintura (`localStorage` → `prefers-color-scheme`), e o `<html data-tema>` é a fonte da verdade que `utilitarios/tema.ts` lê. Botão nos três cabeçalhos e no login.
- **Cabeçalho em largura cheia:** os três cabeçalhos (`CabecalhoTopo`/`Pagina`/`Subpagina`) ocupam a largura toda; o conteúdo é que fica centralizado. Não devolva o `max-w-7xl mx-auto` neles — como cada página usa um `max-w` próprio, num monitor ultrawide a borda esquerda do cabeçalho caía num lugar e a do conteúdo em outro, e o desencontro parecia bug. As listagens do Administrador ganham uma terceira coluna em `2xl` (`2xl:max-w-[88rem]` + `2xl:grid-cols-3`); os painéis (Gestor/Técnico/Minhas Solicitações) ficam em largura de leitura de propósito.
- **Acessibilidade global (`index.css`):** anel de foco `:focus-visible` verde consistente, scrollbar temática e `@media (prefers-reduced-motion: reduce)` desligando animações — **incluindo `animation-delay`**, sem o qual cards com entrada escalonada ficariam invisíveis pelo tempo do atraso.

## Estrutura de Pastas e Organização do Código
A arquitetura do projeto deve seguir uma separação clara de responsabilidades e **adotar estritamente a nomenclatura em Português-BR**:
- **Idioma do Código (Português-BR):** Nomenclaturas de pastas, componentes, funções, variáveis e arquivos devem ser em Português (ex: `Botao` em vez de `Button`, `formatarData` em vez de `formatDate`). Apenas prefixos/termos nativos do React (como `use` para hooks) devem ser mantidos.
- **Modularização e Limite de Tamanho (REGRA DE OURO):** Evite arquivos gigantes. Se um arquivo começar a ficar muito extenso e complexo, ele **DEVE** ser dividido em partes menores (criação de subcomponentes, divisão lógica de arquivos ou extração de regras de negócio para hooks/utilitários independentes).
- **`/src/componentes`**: Componentes visuais isolados e reaproveitáveis (ex: `Botao`, `CampoTexto`, `Paginacao`, `Painel`). Devem ser "burros" (receber apenas props) sempre que possível. `CampoItensCusto` e `CampoNotasFiscais` são o exemplo do porquê: as duas listas editáveis são usadas pelo modal do Técnico e pelo do Administrador, recebem o array e devolvem o array novo, e **não sabem de React Hook Form** — quem liga é um `<Controller>` no formulário de cada tela, o que evitou generics e cast. `esquemaCustoOS.ts` mora ao lado deles, e não numa pasta de esquemas: é o contrato de validação desses componentes, e uma regra corrigida num formulário e esquecida no outro deixaria o Administrador levar 400 num payload que a tela dele aceitou.
- **`/src/paginas`**: Telas completas da aplicação (ex: `PainelGestor.tsx`, `TelaLogin.tsx`). Montagem de layout e consumo de hooks/queries. Se a página for complexa, crie uma subpasta para ela com seus componentes locais (ex: `/src/paginas/PainelGestor/componentes/`) e seus esquemas Zod (ex: `esquemaRejeitarSolicitacao.ts`).
- **`/src/servicos`**: Cliente HTTP (`api.ts`), helpers de requisição (`montarQuery.ts`, `montarMultipart.ts`) e a abstração de endpoints por domínio (`servicoMaquinas.ts`, `servicoOrdensServico.ts`, …). **Nenhum serviço guarda estado** — são funções finas sobre `api.ts`.
- **`/src/hooks`**: Ganchos customizados, quase todos wrappers de `useQuery` (`useMaquinas.ts`, `useSessao.ts`, …). As mutações (`useMutation`) ficam nas próprias páginas, junto do `invalidateQueries` correspondente.

## Autenticação, Segurança e Regras de Negócio (IMPORTANTE)
- **Arquitetura Multi-Locatário (Multi-Tenant) Baseada em Subdomínio:** O sistema atende a múltiplos clientes. O `tenantId` é extraído dinamicamente do subdomínio da URL atual (`window.location.hostname.split(".")[0]`) e injetado em todas as requisições via header estrito `X-tenant-ID`.
- **Gerenciamento de Sessão via Cookies:** a sessão mora **no banco do back** (migration `000022`); o cookie **HttpOnly** leva só um segredo aleatório dela. É terminantemente proibido levar a sessão para `localStorage` ou variáveis globais. O cliente HTTP usa `credentials: "include"`. **Prazos:** a sessão estica com o uso, cai depois de **14 dias sem uso** e **60 dias depois do login** mesmo com uso diário; cai na hora no "Sair" (só aquele aparelho), ao desativar o usuário e ao trocar a senha dele (todos os aparelhos). O perfil vem do banco a cada request, então trocar o perfil de alguém vale na hora.
- **Restauração de Sessão no Bootstrap (`PortaoSessao`):** `App.tsx` envolve as rotas no `PortaoSessao` (`/src/componentes/PortaoSessao.tsx`), que chama `useSessao` (`GET /autenticacao/sessao`) antes de renderizar qualquer rota e exibe `CarregandoSessao` enquanto isso. Sem esse passo, recarregar a página derrubaria o usuário mesmo com o cookie ainda válido no servidor. O endpoint responde **401 quando não há sessão** — o que não é erro, é só "não logado" — por isso `useSessao` usa `retry: false` e `staleTime: Infinity`.
- **Tratamento Global de Erros (401 Não Autorizado):** se a API retornar 401 e a rota atual não for `/login`, o `api.ts` recarrega em `/login?motivo=expirada&voltar=<página atual>` — sem toast, que o recarregamento apagaria. **Sessão vencida e volta ao destino (`utilitarios/destinoLogin.ts`):** o 401 de uma sessão que existia e morreu vem com `codigo: 'sessao_expirada'` (sem cookie nenhum vem sem código); no boot, o 401 do `/autenticacao/sessao` com esse código marca o motivo, e a `RotaProtegida` manda para o login levando `?voltar=` (o link de notificação aberto deslogado, um F5). A `TelaLogin` mostra a faixa âmbar "Sua sessão expirou" e, depois de entrar, navega para o `voltar` — só caminho interno (`destinoSeguro`: começa com `/`, nunca `//` ou `/\`, senão o login viraria um redirecionador para qualquer site).
- **Hierarquia Organizacional (Tenant = Empresa > Loja > Setor):** **empresa É o tenant** (decisão fechada no back-end: `loja.tenant_id` referencia `empresa (id)`, não existe coluna `empresa_id`). Consequências no front: `GET /empresas` devolve **uma lista de um item só**, `Loja.empresaId` é o `tenant_id` da própria linha (campo derivado, só leitura) e `NovaLojaPayload` **não tem** `empresaId` — em `CadastrarLoja` a empresa aparece como campo somente leitura, não como select, e o servidor a tira do token. Não reintroduza a escolha: aceitar empresa do cliente é aceitar tenant do cliente. Cada Empresa possui **Lojas** (unidades/filiais, com `empresaId`); cada Loja possui seus **Setores**. Máquinas e Ordens de Serviço pertencem sempre a uma Loja + Setor (`lojaId` + `setor`).
- **Controle de Acesso por Loja e Setor (Gestor):** o acesso do Gestor é definido por uma lista de **escopos** (`EscopoAcessoGestor[]`, `/src/tipos/autenticacao.ts`), onde cada escopo vincula uma Loja a um conjunto de setores:
  - **Restrito a setores específicos** dentro de uma Loja (`setoresIds: number[]`) — ex: Gestor que responde apenas por "Padaria" e "Açougue" da Loja 1, enquanto outro Gestor da mesma loja responde por "Hortifruti" e "Peixaria".
  - **Total sobre uma Loja inteira** (`setoresIds: 'todos'`) — ex: Gestor que responde por todos os setores das Lojas 2 e 3 simultaneamente (um Gestor pode ter múltiplos escopos).
  **O filtro real é do servidor:** as listagens do Gestor (`/solicitacoes`, `/ordens-servico`, `/preventivas`) já voltam restritas ao escopo do usuário autenticado. Os escopos que chegam na sessão são usados no front apenas para **organização visual** — `agruparPorEscopoGestor` (`/src/utilitarios/acessoGestor.ts`) monta os blocos por Loja e, dentro dela, por Setor. `gestorTemAcesso`/`filtrarPorAcessoGestor`/`obterLojasIdsPermitidas` continuam disponíveis no mesmo arquivo, mas nunca como única barreira de acesso.
- **Controle de Acesso por Setor (Solicitante):** o Solicitante está vinculado a exatamente uma Loja + um Setor (`lojaId`/`setor` na sessão). Ao abrir uma Nova Solicitação OS, ele só vê **máquinas do seu próprio setor** — o front repassa `useMaquinas({ setor, lojaId })` e o servidor aplica a restrição.
- **Máquina exige Manutenção Preventiva (REGRA DE NEGÓCIO):** uma Máquina só pode ser cadastrada (ou salva em edição) se tiver **uma ou mais Manutenções Preventivas** no mesmo formulário — envio bloqueado sem isso, validado via Zod (`esquemaCadastrarMaquina`, `preventivas` com `min(1)`) e enviado na mesma requisição (ver item 5).
- **Acesso Total do Administrador (4º perfil):** o Administrador tem acesso irrestrito a **todo o tenant**, sem escopo por Loja/Setor (`lojaId`, `setor`, `escoposGestor` e `tecnicoId` chegam nulos na sessão). É o perfil responsável por **todos os cadastros do sistema** (Usuários, Lojas, Setores, Técnicos, Máquinas e Empresas Terceirizadas), com CRUD completo em cada um — ver item 12.
- **Rotas Protegidas por Perfil:** `RotaProtegida` (`/src/rotas/RotaProtegida.tsx`) aceita `perfis?: PerfilLogin[]`. Sem autenticação, redireciona para `/login`; autenticado mas com perfil fora da lista, redireciona para a rota inicial do próprio perfil (`ROTA_POR_PERFIL[perfil]`). Em `RotasPrincipais.tsx`: Solicitante (`/home-solicitante`, `/nova-solicitacao`, `/minhas-solicitacoes`, mais as três rotas antigas que redirecionam para `/nova-solicitacao?tipo=…` — ver item 3) usa `perfis={['solicitante']}`; `/painel-tecnico` usa `perfis={['tecnico']}`; `/painel-gestor` e `/dashboard-gestor` usam `perfis={['gestor']}`; `/abrir-os-direta` usa `perfis={['gestor', 'administrador']}`; e todo o grupo do Administrador (`/painel-administrador`, `/administrador/*`, além das telas de cadastro `/cadastrar-usuario`, `/cadastrar-loja`, `/cadastrar-setor`, `/cadastrar-maquina`, `/cadastrar-empresa-terceirizada` — cada uma com uma rota irmã `/:id` para edição) usa `perfis={['administrador']}`. `RotaPublica` protege `/login` no sentido inverso (quem já está logado é mandado para o seu painel).

## Configuração Base de API (`api.ts`) & Variáveis de Ambiente
Todo o tráfego HTTP passa por um wrapper nativo (`fetch`) padronizado — **não existe nenhum caminho alternativo**.
- **Variáveis de Ambiente:** `.env.example` na raiz documenta `REACT_APP_URL_API`. O `api.ts` lê `process.env.REACT_APP_URL_API` com fallback para a URL de homologação e prefixa `https://` caso o protocolo seja omitido.
- **Cabeçalhos Automáticos:** injeta `X-tenant-ID` sempre e `Content-Type: application/json` **exceto** quando o corpo for `FormData` (o navegador precisa definir o `boundary` sozinho).
- **Resolução de Resposta:** lê JSON, texto ou binário/Blob conforme o `content-type` (`application/pdf`, `application/octet-stream`, `image/*` viram `Blob` — usado na impressão de OS).
- **Integração de Alertas:** captura as chaves de erro do backend (`error`, `erro`, `message`, `detalhes`) e exibe o toast automaticamente; falha de rede vira "Não foi possível conectar ao servidor.". Em **5xx** a mensagem ganha " (código: …)" com o `X-Request-ID` da resposta — é o id que o back grava em todas as linhas de log daquele request, então o usuário manda o código e o suporte acha o erro.
- **Métodos:** `api.get/post/put/patch/delete`, todos genéricos em `<T>`.
- **React Query (`App.tsx`):** `retry: 1` e `refetchOnWindowFocus: false` — o `api.ts` já trata 401 globalmente, repetir a requisição só atrasaria o redirecionamento.
- **Cache do React Query:** `staleTime` padrão de **30s** (`App.tsx`) e de **10 min** nos cadastros (`useLojas`/`useSetores`/`useEmpresas`/`useEmpresasTerceirizadas`/`useTecnicos`, `hooks/tempoCache.ts`). Formulários de edição e confirmações buscam com `staleTime: 0`. O Painel do Gestor só busca a lista da aba aberta (`habilitado` nos hooks de lista). ⚠️ **Toda mutação tem que invalidar as chaves que ela altera** — antes o `staleTime: 0` escondia a falta disso (voltar para a lista refazia tudo); hoje o item salvo sumiria por até 30s. Sem cache no servidor, de propósito: para ~20 usuários o Postgres responde sobrando, e invalidar cache por escopo/tenant é onde mora o bug difícil.

## Contrato com o Back-end
Regras transversais que valem para **todos** os serviços. Ao criar um endpoint novo, siga estas convenções em vez de inventar outra.

- **Query string (`montarQuery.ts`):** monta `?a=1&b=2` descartando `undefined`/`null`/`''` (evita `?lojaId=undefined`). Arrays viram lista separada por vírgula (ex: `status=Aberta,Pausada`).
- **Upload (`montarMultipart.ts`):** endpoints com arquivo recebem `multipart/form-data` com a parte **`dados`** carregando o JSON e as demais partes carregando os arquivos (`foto`, `video`). Usado em `POST/PUT /maquinas`, `/lojas`, `/setores`, `/empresas-terceirizadas` (foto opcional — sem ela, o `PUT` mantém a atual) e nas três criações de solicitação.
- **Formato de data/hora (`dataBackend.ts`) — REGRA CRÍTICA:** o back-end troca datas como **`dd/mm/yyyy HH:MM:SS`** (ou `dd/mm/yyyy` sem hora). **Nunca** use `new Date(textoDaApi)` direto: o parser nativo não entende `dd/mm/yyyy` e interpreta `08/09/2026` como 8 de setembro num ambiente e 9 de agosto em outro. Use `converterDataBackend`, `formatarDataHoraBackend`, `agoraParaBackend`, `ehDataBackendValida` e — para `<input type="date">`, que trabalha em `YYYY-MM-DD` — `converterDataFormularioParaBackend` / `converterDataBackendParaFormulario`.
- **Paginação (`RespostaPaginada<T>`, `/src/tipos/paginacao.ts`):** `{ dados, pagina, totalPaginas, total }`. Usada nos endpoints paginados **no servidor** (`GET /usuarios`, `GET /solicitacoes/minhas` e `GET /ordens-servico?pagina=` — este só quando a página é pedida, 12 por página, nas telas de histórico do Administrador; sem `pagina` ele devolve o array inteiro, que é o que Gestor e Técnico usam). Os demais endpoints devolvem array simples e a tela pagina client-side com o componente `Paginacao` (10 por página) — ver item 12.
- **O servidor é a fonte da verdade dos fatos:** instante de criação/abertura/encerramento, autoria (`solicitanteId`, `lancadoPorNome`, `encerradoPorNome`), horas calculadas (`horasTrabalhadas`/`horasParada`), escopo de acesso e a flag `finalizada` são **derivados no servidor**. O front nunca envia esses campos; quando exibe um "Data/Hora" antes de salvar, é apenas confirmação visual do instante local.
- **Criação de solicitação:** `POST /solicitacoes/maquinario` e `/solicitacoes/reparo` são chamadas por **um único despachante**, `servicoSolicitacoes.criarPorTipo`, alimentado pela tela unificada (item 3) — não chame os serviços direto de uma tela nova.

## Especificações de Telas — uma por pasta

Cada tela tem a própria spec em `src/paginas/<Tela>/CLAUDE.md`, carregada sozinha quando o trabalho toca aquela pasta. **Antes de mexer numa tela que não é a sua pasta atual, leia a spec dela.** As specs se citam por número de item:

| item | tela (pasta em `src/paginas/`) |
|---|---|
| 1 | `TelaLogin` |
| 2 | `HomeSolicitante` |
| 3 | `NovaSolicitacao` |
| 4 | `MinhasSolicitacoes` |
| 5 | `CadastrarMaquina` (+ `ModalManutencaoPreventiva`) |
| 6 | `PainelGestor` |
| 7 | `CadastrarUsuario` |
| 8 | `DashboardGestor` |
| 9 | `PainelTecnico` (inclui os modais de Acionar Terceiro e Pausar) |
| 10 | `ModalAbrirOrdemServico` |
| 10b | `AbrirOSDireta` |
| 11 | `ModalEncerrarOrdemServico` |
| 12 | `PainelAdministrador` e `AdministradorCustosPendentes` |
| 13 | `AdministradorOSFinalizadas` e `ModalDetalhesOS` |

Histórico do que já foi verificado no navegador: `docs/historico-verificacoes.md`.

## Repaginação visual (03/09/2026) — o sistema saiu do fundo escuro

O front inteiro foi realinhado a um visual de referência (o painel do SGEPI), **mantendo o
verde `marca` como cor de acento**. 71 arquivos, mais linhas removidas do que adicionadas.
O resumo das decisões está em "Identidade Visual" acima; o que segue é o que dói se for
desfeito por engano.

- **A mudança de verdade foi de superfície, não de cor.** Antes: fundo `bg-slate-600` com
  cartões brancos flutuando em sombra alta. Agora: fundo claro, cartões brancos delimitados
  por linha fina de 1px. Toda classe que assumia fundo escuro (`text-slate-300`,
  `bg-white/10`, `border-white/10`, títulos em `text-white`) foi convertida.
- **A borda fina vem do token, não das telas.** `shadow-card`/`shadow-card-hover` ganharam
  um anel de 1px como primeiro valor. Um arquivo mudou e 45 usos acompanharam. Se o peso
  das superfícies precisar de ajuste, é em `tailwind.config.ts` — resista a pôr `border`
  solto em cada card, que foi justamente o que se evitou.
- ⚠️ **Estado ativo nunca é pílula branca.** Os filtros do Gestor e do Técnico marcavam o
  ativo com `bg-white`, que sobre fundo claro não diferencia coisa alguma. Ativo é
  `bg-marca-600` + texto branco, em aba, chip e filtro.
- ⚠️ **Trocar fundo sem varrer a cor do texto quebra a tela.** O `CardEstatistica` da Home
  era bloco escuro; escurecer o texto dele junto com o resto deixaria escuro sobre escuro.
  Ao mexer em fundo, grepe `text-white`, `text-slate-200/300` e `bg-white/*` no arquivo.
- **Badges são todos tingidos claros** (`bg-*-100` + `text-*-700` + `ring-*-600/15`), o
  padrão que `BadgeStatus` já usava. `BadgeAfetaProducao` e `BadgeOrigemPreventiva`
  deixaram o gradiente e entraram nesse mesmo formato.
- **`componentes/Painel.tsx`** foi criado nessa passagem: seção com selo de ícone no
  cabeçalho, variantes `padrao` (verde) e `edicao` (âmbar), para blocos dentro de um card.
  **Ainda não é usado por nenhuma tela** — use-o ao montar formulários seccionados em vez
  de remontar o cabeçalho na mão.

## Pegadinhas transversais (já corrigidas — não reintroduza)

- ⚠️ **Custo `0` é válido em todos os campos de valor** (serviço sem peça, conserto em garantia). Toda soma e exibição de custo usa `??`, **nunca `||`** — `custoTotal` em `PainelGestor`, `CardOSFinalizada` e `AdministradorOSFinalizadas`, e os cards desta tela comparam com `!== undefined`. Trocar por `||` faria R$ 0,00 sumir e virar `—`. Nos esquemas Zod é `nonnegative()`, e no back `binding:"gte=0"` — nunca `required`, que rejeita zero em campo numérico.

- ⚠️ **Achado que só apareceu rodando a API de verdade:** nota repetida devolvia **500**. O
  service já devolvia `ErrDadoDuplicado` e o teste de integração passava; faltava o `case`
  no `switch` do controller, porque até a `000011` essa rota era um `UPDATE` 1:1 e não tinha
  como colidir. O teste de integração para no service e nunca atravessa o controller.

- ⚠️ **Dropdown dependente: trocar o "pai" tem que zerar o "filho".** Nos pares Loja → Setor, mudar a loja deixava o `filtroSetor` com o id de um setor da loja ANTERIOR. Esse id não casa com nenhuma das novas `<option>`, então o `select` renderiza **em branco** enquanto o filtro continua ativo — a lista volta vazia e nada na tela explica por quê. Corrigido em `AdministradorMaquinas` e `AdministradorOSFinalizadas` com um `aoMudarLoja` que faz `setFiltroSetor('')` junto. **Sempre no `onChange` do pai, nunca num `useEffect` sobre ele**: o efeito rodaria também na montagem e apagaria uma seleção legítima (é o mesmo motivo do comentário em `CadastrarMaquina`, que já resolvia assim com `setValue('setorId', 0)`). Vale para qualquer par futuro, não só Loja/Setor.
- ⚠️ **`PortaoSessao` precisa esperar o espelhamento no estado, não só a query.** O
  `entrar(sessao)` roda num `useEffect`, ou seja, DEPOIS da primeira renderização dos
  filhos — que acontecia com `autenticado = false`, e a `RotaProtegida` redirecionava antes
  do efeito rodar. Efeito prático: **todo F5 ou link direto numa rota interna**
  (`/cadastrar-setor`, `/cadastrar-loja/3`) devolvia o usuário para a rota inicial do
  perfil, com a sessão válida no servidor. A guarda hoje é
  `if (isPending || (sessao && !autenticado))`.
- ⚠️ **`{condicao && numero && (...)}` renderiza o número quando ele é 0.** Era o "0" solto
  que aparecia em `CadastrarSetor` antes de escolher a loja (o select começa em 0). Use
  `lojaId > 0`. O mesmo padrão existia em `CadastrarLoja` e saiu junto com o select de
  empresa.
- ⚠️ **Na edição, o `<select>` em cascata perde o valor que o `reset()` acabou de pôr**: as
  options só existem quando `useSetores(lojaId)` responde, e o `reset` roda antes — o
  campo obrigatório aparece vazio. `CadastrarMaquina` reaplica com um efeito sobre
  `setoresDaLoja`; o mesmo cuidado vale para qualquer cascata nova.
- ⚠️ **`UploadFoto` recebe `urlExistente`** para mostrar a foto já salva no servidor. Sem
  isso, a máquina COM foto abria dizendo "Clique para selecionar uma foto", e o
  administrador não tinha como saber que ela existia — nem que salvar sem escolher a
  preserva (o back faz `COALESCE`). Só o preview local é blob e leva `revokeObjectURL`.
- **Card de máquina mostra `numeroPatrimonio`, não `maquina.id`**: é por ele que a busca da
  mesma tela filtra, e é o número que existe na etiqueta.

## Domínio e build (antes de subir)

Front e API ficam sob o **mesmo domínio registrável** — `*.radaptech.com.br` nos dois. O
cookie de sessão é `HttpOnly` + `SameSite=Lax`: em domínios registráveis diferentes o login
responde 200 e o navegador **descarta o cookie**, e o usuário volta pro login em loop sem
erro visível. O CORS do back só libera `radaptech.com.br` e `localhost`.

⚠️ **`REACT_APP_URL_API` é resolvida em BUILD TIME**, não em runtime: o `define` do
`vite.config.ts` injeta o valor no bundle. Definir a variável só no runtime do serviço não
tem efeito — ela precisa existir no momento do `vite build`, senão o bundle sai com o
fallback (`URL_PADRAO_API` em `api.ts`) compilado dentro. Em dev o compose sobrescreve com
`/api` (mesma origem, atrás do traefik), e por isso o `api.ts` deixa passar valor começado
por `/`.

## Dockerfile de produção
`dockerfile` (raiz do repo) — multi-stage, sem Node em produção: um SPA compila pra
arquivo estático, então rodar um processo Node 24h só pra servir arquivo já pronto é
desperdício. `builder` (`node:22-alpine`) roda `npm ci` + `npm run build`; o estágio
final é `nginx:alpine` servindo `dist/` — **94.6MB**, testado local (`docker build` +
`docker run` fora do Compose, como o Railway rodaria).
- **`REACT_APP_URL_API`/`VITE_USE_MOCKS` viram `ARG`, não `ENV` do container final** —
  mesmo motivo de "Domínio e build" acima: são resolvidas em build time, então precisam
  existir no `docker build --build-arg REACT_APP_URL_API=https://api.radaptech.com.br`,
  nunca só na configuração de runtime do serviço. **Testado**: o valor aparece de fato
  dentro do bundle (`grep` no `.js` gerado).
- **`nginx.conf.template` faz o fallback de SPA** (`try_files $uri $uri/ /index.html`) —
  sem isso, qualquer navegação direta ou F5 numa rota interna (`/painel-administrador`,
  `/cadastrar-loja/3`) responde 404 do nginx, porque não existe arquivo com esse nome; é
  o React Router quem decide o que renderizar, não o servidor. **Testado**: deep link
  direto numa rota interna volta 200.
- ⚠️ **`listen ${PORT}`, não uma porta fixa — achado em produção (23/08/2026).** Primeira
  versão tinha `listen 80` fixo; o Railway injeta `PORT` (no caso do projeto, `8080`) e
  roteia o domínio pra ela, e nginx não lê variável de ambiente sozinho — resultado foi
  502 (mesmo sintoma que o back-end teve com a porta fixa em `8081`, ver
  `../sistema-OSm--Back-end/CLAUDE.md`). O arquivo virou **`nginx.conf.template`**, copiado
  pra `/etc/nginx/templates/` em vez de direto em `conf.d/`: a imagem oficial `nginx:alpine`
  já roda `envsubst` nesses arquivos sozinha no boot (`docker-entrypoint.d`, feature nativa,
  sem script custom) e só substitui variáveis que **existem de verdade no ambiente** — por
  isso `$uri`/`$uri/` do nginx (que não são env var) sobrevivem intactos, só `${PORT}` é
  trocado. `ENV PORT=8080` no Dockerfile é o default se ninguém injetar nada. **Testado**:
  `PORT=8080`, `PORT=3333` e sem `PORT` nenhum — os três renderizam o `listen` certo e
  respondem 200.
- `gzip on` pro `.js`/`.css`/`.json`/`.svg` — o bundle principal sai ~400KB, e mobile é
  requisito do projeto (ver "Mobile-First" acima). **Testado**: `Content-Encoding: gzip`
  confirmado no bundle de produção.
- **Dev não ganhou Dockerfile próprio** (diferente do back-end, que tem `dockerfile.dev`
  separado) — o `docker-compose.yml` já roda `image: node:22-alpine` direto com
  `npm run dev`, e o Vite faz hot-reload nativo; não existe um "CompileDaemon" do front
  pra precisar de uma imagem própria só pra isso.

## CI
- Sem testes automatizados — validação é manual no navegador (modo mock ou API real).
- **`npm run build`, não só `tsc --noEmit`**: pega os dois de uma vez — erro de tipo
  **e** erro que só aparece no build de produção (import quebrado, asset faltando), que
  o `vite dev` é mais tolerante e deixaria passar batido.

## PWA (app instalável)

O mesmo app vira "app" no celular/desktop: ícone na tela inicial, abre sem a barra do
navegador. Sem loja, sem build separado — e sem `vite-plugin-pwa`, de propósito (abaixo).

- **`public/manifest.webmanifest`** (nome, cores, `display: standalone`, `start_url: "/"` —
  o `/` já manda cada perfil pro próprio painel) + tags no `index.html` (manifest,
  `apple-touch-icon`, `apple-mobile-web-app-*`). Cada subdomínio de tenant é uma origem, então
  cada tenant vira um app instalado separado — é o que se quer.
- **Ícones (`public/icones/`) saem de `npm run icones:pwa`** (`scripts/gerar-icones-pwa.mjs`):
  a chave inglesa do cabeçalho em branco sobre `marca-600`, rasterizada pelo Chrome do
  puppeteer. PNGs versionados; rode de novo só se mudar cor/desenho. `maskable` tem o desenho
  menor (zona segura de 80% — o Android recorta em círculo); `apple-touch-icon` não tem
  transparência (o iOS pinta de preto). O `favicon.svg` da aba continua o antigo.
- **`public/sw.js` — service worker nosso, JS puro, fora do bundle.** Sem precache: o app não
  funciona sem a API, e precache é o jeito clássico de prender o usuário numa versão velha.
  Só intercepta navegação (rede primeiro; sem rede, uma página "Sem conexão" em vez do erro do
  navegador). É onde o Web Push vai entrar.
- **Atualização (`utilitarios/registrarServiceWorker.ts` + `componentes/AvisoNovaVersao.tsx`):**
  o plugin `versaoServiceWorker` (`vite.config.ts`) carimba o `sw.js` com um id por build →
  cada deploy é um service worker novo → ele instala e **espera** → o app mostra o toast "Nova
  versão disponível" → só no clique em "Atualizar" ele assume (`PULAR_ESPERA`) e a página
  recarrega. Nunca troca sozinho: recarregar no meio de um encerramento de OS perderia o que
  foi digitado. Checa ao voltar pro app (aba visível) e a cada hora. ⚠️ O `controllerchange`
  só recarrega se o usuário pediu — sem essa trava, a **primeira** instalação recarregaria a
  tela de quem acabou de abrir o app.
- **nginx (`nginx.conf.template`):** `sw.js`, `manifest.webmanifest` e `index.html` com
  `Cache-Control: no-cache` (sempre revalidam — senão o app instalado abriria o HTML velho);
  `/assets/` com hash no nome, `immutable` por 1 ano.
- **Exige HTTPS** (ou `localhost`/`*.localhost` em dev). No iPhone só instala por Compartilhar →
  Adicionar à Tela de Início, e só lá o push funciona (iOS 16.4+).
- **Verificado (13/10/2026)** com a imagem de produção (`docker build` + nginx): cabeçalhos e
  MIME acima, SW ativo controlando a página, manifest e ícones 200, aviso de versão nova
  aparecendo após trocar o `sw.js` e "Atualizar" recarregando com o SW novo, e a página "Sem
  conexão" com o servidor fora do ar. **Não verificado:** instalação num Android/iPhone de
  verdade (precisa do HTTPS de produção ou homologação).

## Notificações (sininho) — central do PWA

O WhatsApp saiu (13/10/2026); o aviso agora mora no próprio sistema. Regra de quem recebe o
quê está no back (`../sistema-OSm--Back-end/docs/fluxo-de-negocio.md`, "Notificações").

- **`componentes/SinoNotificacoes.tsx`** (botão + selo + mutações) e **`PainelNotificacoes.tsx`**
  (popover com a lista, "carregar mais", "marcar todas como lidas"), nos dois cabeçalhos com
  sino (`CabecalhoTopo`/`CabecalhoPagina`). No celular o popover ocupa a largura toda abaixo
  do cabeçalho; do `sm` pra cima ancora no botão. Fecha com clique fora ou Esc.
- **Contrato (`servicoNotificacoes.ts`, `tipos/notificacao.ts`):** `GET /notificacoes?pagina=`
  (`RespostaPaginada`, 20 por página), `GET /notificacoes/nao-lidas`, `POST /notificacoes/:id/lida`,
  `POST /notificacoes/lidas`. As três últimas devolvem `{ total }` — a contagem **depois** da
  ação, gravada direto no cache (`setQueryData`) em vez de buscar de novo.
- **Contagem (`useContagemNaoLidas`):** `staleTime: 0`, `refetchInterval` de 60s (pausa com a
  aba em segundo plano) e `refetchOnWindowFocus: true` — a única query do app que refaz no
  foco: voltar pro app depois de ver o push tem que mostrar o número novo na hora.
- **Clique numa notificação:** marca como lida e `navegar(notificacao.url)`. A url é um caminho
  relativo gravado pelo servidor (`/painel-gestor?solicitacao=N`, `/painel-gestor?os=N`,
  `/painel-tecnico?os=N`, `/minhas-solicitacoes?solicitacao=N`) e o **painel de destino** abre o
  modal certo via `hooks/useIdDaUrl.ts`, que também tira o parâmetro da URL (F5/voltar não
  reabrem). Detalhe de cada tela na spec dela (itens 4, 6, 9).
- ⚠️ **Cores do ícone por tipo só usam pares que o tema escuro inverte** (`index.css`):
  `sky`/`violet` e `text-marca-700` não estão lá e sairiam escuro sobre escuro.

## Web Push (aviso com o app fechado)

O servidor manda um push por notificação gravada; o `public/sw.js` mostra e cuida do toque.
Contrato: `GET /push/chave-publica` (`{ chavePublica }`, **null = servidor sem VAPID**, o front
não oferece nada), `POST /push/inscricoes` (o `subscription.toJSON()` direto, 204),
`POST /push/inscricoes/remover` (`{ endpoint }`, 204). Payload do push:
`{ id, tipo, titulo, corpo, url, naoLidas }`.

- **Ativar (`hooks/usePush.ts` + `componentes/AtivacaoPush.tsx`, no topo do painel do sininho):**
  a permissão **só é pedida no clique em "Ativar"** — nunca sozinha ao abrir o app (fora de
  gesto o navegador ignora, e pedir sem contexto é o que faz o usuário negar). Estados:
  `desativado` (botão), `ativado` (linha "Avisos ativos neste aparelho · Desativar" no pé do
  painel), `bloqueado` (permissão negada — só se desfaz nas configurações, o texto explica onde),
  `instalar` (iPhone fora do app instalado: passo a passo Compartilhar → Adicionar à Tela de
  Início — no Safari comum o `PushManager` nem existe) e `indisponivel` (navegador sem push ou
  servidor sem chave — não mostra nada).
- **Navegador (`utilitarios/pushNavegador.ts`):** permissão, `subscribe`, número no ícone
  (`setAppBadge`), limpar a bandeja. Inscrição feita com **outra chave VAPID** (o servidor trocou
  o par) é desfeita e refeita — senão o serviço de push recusaria tudo o que o servidor assina.
  Pra ler usa `getRegistration()` (imediato); só o `subscribe` espera o `ready`, com prazo de 5s.
- **`sw.js`:** `push` → `showNotification` (ícone, `badge-96.png` monocromático pra barra do
  Android, `tag` por id pra reentrega não duplicar) + `setAppBadge(naoLidas)` + avisa as abas
  (`PUSH_RECEBIDO` → o sininho busca na hora). `notificationclick` → com o app aberto, foca a aba
  e manda `ABRIR_NOTIFICACAO` (o React marca como lida e navega **sem recarregar**); fechado,
  `openWindow(url + &notificacao=<id>)`. Só abre caminho da própria origem.
- **`hooks/useIntegracaoPush.ts` (montado no `PortaoSessao`):** número no ícone = não lidas do
  sininho; tudo lido → limpa a bandeja; trata as mensagens do sw.js; ao entrar (e em
  `pushsubscriptionchange`) **reenvia a inscrição** que o navegador já tem — o servidor pode ter
  perdido a linha, e o upsert troca o dono se outra pessoa usava o aparelho.
- ⚠️ **`?notificacao=` é lido e tirado da URL ANTES do router montar** (`main.tsx` →
  `utilitarios/notificacaoDoPush.ts`). Se o React Router visse o parâmetro, o primeiro
  `setSearchParams` de uma tela (o painel consumindo `?os=`) o regravaria; um `replaceState`
  feito depois, por fora, deixaria o router com a URL velha.
- **Logout (`useSair`) desliga o push ANTES do `/autenticacao/logout`** (o `remover` precisa da
  sessão): sai do navegador, zera o número do ícone e limpa a bandeja — num celular
  compartilhado, o próximo não recebe nem vê os avisos de quem saiu. Quem entra depois ativa de
  novo no sininho. Sessão que **expira** (sem clicar em Sair) mantém a inscrição; no próximo
  login ela é reenviada e passa a ser de quem entrou.
- **Mock (`mocks/rotas/push.ts`):** chave pública P-256 real (só a pública — o `subscribe` valida
  o formato), inscrições num `Map`. Dá pra ver ativar/desativar/sair; nada chega por push.
- **Verificado (13/10/2026) no Chrome desktop contra a API real** (`demo.localhost:8090` — `*.localhost`
  é contexto seguro): ativar grava `dispositivo_push`; gestor abre OS → push real via FCM chega
  em ~1s com título/corpo/url certos e o sininho atualiza sozinho; clique na notificação com o
  app aberto marca como lida e abre o detalhe; `?notificacao=` (caminho do app fechado) idem;
  logout remove no navegador e no banco; novo login mostra "Ativar" de novo; painel em 619px sem
  rolagem lateral. **Não verificado:** Android/iPhone reais (precisa de HTTPS — Parte 8),
  telas `bloqueado`/`instalar` (texto estático), e o `openWindow` em si (o clique com o app
  fechado foi simulado abrindo a URL que ele monta).

## Helpers de Domínio (evite reimplementar)
- **`alvoOS.ts`** — Solicitação e OS apontam ou para uma máquina cadastrada (Maquinário) ou para um item digitado na hora (Pequeno Reparo). Use `obterNomeAlvo`, `obterCodigoAlvo` e `combinaBuscaAlvo` em vez de repetir o encadeamento `maquinaNome ?? itemDescricao ?? '—'`.
- **`dataBackend.ts`** — toda conversão de data que entra ou sai da API (ver "Contrato com o Back-end").
- **`dataEstaNoIntervalo.ts`** — compara uma data do back-end com um intervalo vindo de `<input type="date">`, convertendo para `YYYY-MM-DD` e comparando lexicograficamente (equivale à comparação cronológica, sem construir `Date` e sem depender de fuso).
- **`acessoGestor.ts`** — agrupamento/checagem por escopo do Gestor (organização visual; a restrição real é do servidor).
- **`navegacaoNiveis.ts`** + `hooks/useNavegacaoNiveis.ts` + `componentes/NavegacaoNiveis.tsx`/`NavegacaoLojaSetor.tsx` — navegação por cliques Loja → Setor → … com o nível na URL, usada pelos painéis do Gestor e do Técnico. Para hierarquia nova, use isto em vez de `<select>` em cascata ou lista agrupada.
- **`calcularHoras.ts`** — prévia local de horas; os valores oficiais vêm do servidor.
- **`formatarData.ts` / `formatarMoeda.ts`** — formatação de exibição (pt-BR / BRL).
