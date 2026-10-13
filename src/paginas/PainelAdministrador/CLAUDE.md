> Spec da tela, carregada só quando o trabalho toca esta pasta. Referências "item N" apontam para as outras telas — o índice está no `CLAUDE.md` da raiz do repo.

### 12. Painel do Administrador (`PainelAdministrador` - 4º perfil)
- **Perfil:** `administrador`, com acesso total ao tenant (sem escopo de Loja/Setor). Login redireciona para `/painel-administrador` (`perfis={['administrador']}`).
- **Home do Painel:** cards de navegação (`CardAcao`) para `Usuários`, `Lojas`, `Setores`, `Máquinas`, `Empresas Terceirizadas`, `Custos Pendentes` e `OS Finalizadas` — os dois últimos voltaram à grade em 05/09/2026, quando o ciclo de vida da OS ficou completo no back (ver `docs/historico-verificacoes.md`); `Técnicos` nunca existiu como tela.
- **CRUD Completo em cada entidade:** telas de listagem próprias (`AdministradorUsuarios`, `AdministradorLojas`, `AdministradorSetores`, `AdministradorMaquinas`, `AdministradorEmpresasTerceirizadas`) com **barra de busca** (`CampoBusca`), **filtros** (por perfil/loja/setor conforme a entidade), **Editar** (ícone lápis → tela de cadastro em modo edição via `/:id`) e **Excluir** (ícone lixeira + `ModalConfirmarExclusao`). Mobile-First obrigatório: cada linha empilha em coluna (`flex-col`) até `sm`, virando linha (`sm:flex-row sm:justify-between`) a partir daí, com `min-w-0`/`truncate` para não estourar em telas estreitas.
- **Empresas Terceirizadas:** entidade simples (`EmpresaTerceirizada`: `nome`, `especialidade?`, `telefone?`), sem vínculo de Loja/Setor — cadastrada aqui e consumida pelo **Técnico** no `ModalAcionarTerceiro` (item 9).
- **Paginação — duas estratégias:**
  - **Servidor:** `AdministradorUsuarios` passa `busca`/`perfil`/`lojaId`/`pagina` para `GET /usuarios` e usa `resposta.dados` + `resposta.totalPaginas`.
  - **Cliente:** as demais listagens recebem array simples e paginam com `Array.slice` em blocos de **10** (`TAMANHO_PAGINA`), usando o componente compartilhado `Paginacao` (`/src/componentes/Paginacao.tsx`).
  - Em ambos os casos, a página volta para 1 quando busca/filtros mudam — ajuste feito **durante a renderização**, comparando uma chave dos filtros com o valor anterior, e não em `useEffect` (evita `setState` dentro de efeito).
- **OS Finalizadas (`AdministradorOSFinalizadas`):** ver item 13.
