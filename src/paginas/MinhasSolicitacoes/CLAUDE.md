> Spec da tela, carregada só quando o trabalho toca esta pasta. Referências "item N" apontam para as outras telas — o índice está no `CLAUDE.md` da raiz do repo.

### 4. Tela de Minhas Solicitações (`MinhasSolicitacoes`)
- **Estrutura:** layout cinza, barra de pesquisa e filtros em badges (`Todos`, `Pendente`, `Convertida`, `Rejeitada`) — `BarraFiltros` local.
- **Listagem & Paginação:** `useSolicitacoes({ pagina, status, busca })` → `GET /solicitacoes/minhas` devolvendo `RespostaPaginada<SolicitacaoOS>`. **Paginação e filtros são do servidor**; a tela usa `placeholderData: keepPreviousData` para não piscar entre páginas. Cards (`CardSolicitacao`) mostram número, status, tipo e descrição — e, quando `status === 'Rejeitada'`, o **motivo da rejeição** escrito pelo Gestor (item 6) em destaque vermelho.
- O servidor restringe a listagem ao solicitante autenticado — não há parâmetro de "quem sou eu" no cliente.
- **Link de notificação (`?solicitacao=N`, `hooks/useIdDaUrl.ts`):** destino de "Solicitação aceita/rejeitada". Abre o `ModalDetalhesSolicitacao` (contexto "Minhas Solicitações") com `GET /solicitacoes/:id` — mostra o status novo e, se rejeitada, o motivo. O parâmetro sai da URL ao abrir.
