> Spec da tela, carregada só quando o trabalho toca esta pasta. Referências "item N" apontam para as outras telas — o índice está no `CLAUDE.md` da raiz do repo.

### 2. Tela Principal do Solicitante (`HomeSolicitante`)
- **Cards de Ação (dois, desde a unificação das OS):**
  - "Nova Solicitação" — `variante: 'destaque'`, verde tingido claro com selo de ícone verde sólido, ícone `CirclePlus`, com a descrição "Maquinário ou Pequenos Reparos" (item 3). **A Home deixou de ser um menu de caminhos:** o tipo é escolhido dentro do próprio formulário. As variantes `'reparo'` (laranja) e `'terceiros'` (azul) do `CardAcao` continuam existindo, hoje sem uso aqui.
- **Cards de Estatísticas (Grid Inferior):** três blocos com os contadores `Abertas`, `Em andamento`, `Concluídas`, vindos de `useResumoSolicitacoes` (`GET /solicitacoes/resumo`, tipo `ResumoSolicitacoes`) — contagem feita no servidor, não somando listas no cliente.
