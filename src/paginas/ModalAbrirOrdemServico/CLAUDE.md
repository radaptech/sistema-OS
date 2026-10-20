> Spec da tela, carregada só quando o trabalho toca esta pasta. Referências "item N" apontam para as outras telas — o índice está no `CLAUDE.md` da raiz do repo.

### 10. Modal de Abertura de OS (`ModalAbrirOrdemServico` - Gestor)
- **Único modal de abertura:** atende os dois tipos abríveis (`maquinario` e `reparo`) — ambos precisam de Técnico + Urgência, porque toda OS passa pelo Técnico.
- **Nível de Urgência \***: cards coloridos (Baixa/Média/Alta → `IdUrgencia`).
- **Técnico Responsável \***: select com os técnicos disponíveis para a loja da solicitação (`useTecnicos(lojaId)` → `GET /tecnicos?lojaId=`), exibindo nome **e área de atuação** (ex: "Roberto Alves — Refrigeração").
- **Data/Hora:** exibida como confirmação (`new Date()` local), **não é campo editável e não é enviada** — o instante da abertura é fato do servidor.
- O marcador **Afeta Produção** **não** é preenchido aqui — vem do Solicitante (item 3), é exibido no `ModalDetalhesSolicitacao` (item 6) e define se a OS acumula tempo de máquina parada (item 9).
- **Ao salvar:** `servicoSolicitacoes.abrirOS` → `POST /solicitacoes/:id/abrir-os` com `{ urgencia, tecnicoId }`; o servidor cria a `OrdemServico` e marca a solicitação como `Convertida`. A tela invalida `['solicitacoes-os-todas']` e `['ordens-servico-todas']`.
