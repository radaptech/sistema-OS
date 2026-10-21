# Princípios de Motion

Baseado na skill [design-motion-principles](https://github.com/kylezantos/design-motion-principles)
(Emil Kowalski · Jakub Krehel · Jhey Tompkins).

Este é um **sistema de produtividade usado o dia inteiro** — painéis de OS, filas de
aprovação, cadastros. A ponderação adotada é **Emil primário, Jakub secundário**:
movimento rápido, discreto e a serviço da tarefa. A régua é:

> "A melhor animação é aquela que passa despercebida."

Se uma animação chama atenção para si mesma numa tela que o técnico abre 40 vezes por
dia, ela está errada.

---

## O teste de frequência (aplicar ANTES de animar)

| Frequência de uso | O que fazer |
|---|---|
| Raro (mensal) | Pode ser expressivo |
| Ocasional (diário) | Sutil e rápido |
| Frequente (centenas/dia) | Sem animação, resposta instantânea |
| Iniciado por teclado | Nunca animar |

Aplicações concretas neste projeto:

- **`active:scale-[0.98]` do `Botao` não tem transição.** É resposta ao toque; animar
  atrasaria a sensação do clique.
- **Trocar de aba** (Painel do Técnico / Gestor) **não anima o conteúdo.** É a ação mais
  repetida dessas telas.
- **Digitar na busca não re-anima a lista.** Ver "Entrada de listas" abaixo.

---

## Tokens

Definidos em `tailwind.config.ts`. Não use `ease`/`ease-out` cru: são curvas fracas e
deixam a animação com cara de template.

| Token | Valor | Uso |
|---|---|---|
| `ease-entrada` | `cubic-bezier(0.22, 1, 0.36, 1)` | Entradas, desaceleração firme |
| `ease-saida` | `cubic-bezier(0.4, 0, 1, 1)` | Saídas, acelera para fora |
| `ease-painel` | `cubic-bezier(0.32, 0.72, 0, 1)` | Modais (curva de sheet iOS) |
| `duration-instantaneo` | 120ms | Saídas |
| `duration-rapido` | 160ms | Micro-interações |
| `duration-padrao` | 200ms | Entradas de conteúdo |

**Nada passa de 300ms.** 180ms parece mais responsivo que 400ms, e percepção de
velocidade é performance percebida.

### Animações

| Classe | O que faz |
|---|---|
| `animate-fade-in` / `animate-pop-in` | Entrada de overlay / cartão de modal |
| `animate-fade-out` / `animate-pop-out` | Saída correspondente (mais curta e discreta) |
| `animate-surgir` | Entrada de conteúdo: opacidade + subida 6px + desfoque |
| `animate-varrer` | Varredura do skeleton |

**Saída é sempre mais fraca que entrada** (120ms vs 150–200ms, 2px vs 6px): quem fechou
já está olhando para a próxima coisa; prolongar a despedida só atrasa a próxima ação.

---

## Só `transform`, `opacity` e `filter`

Nunca anime `width`, `height`, `top`, `left`, `margin`, `padding` — elas disparam
recálculo de layout a cada quadro. Todas as animações do projeto se resumem a essas três
propriedades. `will-change` não é usado: é otimização pontual, não tempero geral.

---

## Acessibilidade (obrigatório, sem exceção)

`src/index.css` desliga movimento globalmente sob `prefers-reduced-motion: reduce`.

**Cuidado que já custou caro:** além de `animation-duration`, é preciso zerar
`animation-delay`. Sem isso, um card com entrada escalonada (`atrasoEntrada`) fica preso
no estado inicial — **invisível** — pelo tempo do atraso, mesmo com a animação "desligada".

O skeleton foi desenhado para degradar bem: a varredura termina fora da área visível, então
sob movimento reduzido sobra só o bloco cinza estático, que continua comunicando "carregando".

---

## Padrões do projeto

### Skeleton em vez de "Carregando..."

`src/componentes/Esqueleto.tsx` — `Esqueleto`, `EsqueletoLista`, `EsqueletoCardOS`,
`EsqueletoLinhaCadastro`.

O esqueleto tem **o formato do conteúdo que vem depois**: quando os dados chegam, nada
salta de lugar. Um texto centralizado "Carregando..." não faz isso — ele some e o conteúdo
aparece em outra posição.

### Entrada de listas

`animate-surgir` + `atrasoEntrada(indice)` (`src/utilitarios/atrasoEntrada.ts`).

O escalonamento é de 28ms e **para no 6º item** — sem esse teto, o 30º card de uma listagem
esperaria quase um segundo, e a animação viraria espera.

Detalhe que faz funcionar: com `key` estável, o React reaproveita o nó do DOM ao filtrar ou
paginar, então **itens que permanecem não re-animam** — só os que realmente entraram. É por
isso que digitar na busca não faz a lista inteira piscar.

### Saída de modais

`useSaidaAnimada(aoFechar)` (`src/hooks/useSaidaAnimada.ts`) segura a desmontagem pelo
tempo da animação de saída. Os 13 modais usam.

> A constante `DURACAO_SAIDA_MS` precisa acompanhar `fade-out`/`pop-out` no
> `tailwind.config.ts`. Se ficar maior que a animação, o modal fica parado e invisível
> antes de sumir.

### Carregamento sob demanda

- **Rotas:** `React.lazy` em `RotasPrincipais.tsx` — cada tela é um chunk. O Login fica no
  bundle inicial de propósito (é a primeira tela de todos).
- **Fallback:** `CarregandoRota` só aparece **depois de 150ms**. Numa conexão boa o chunk
  chega em dezenas de milissegundos, e piscar um indicador nesse tempo incomoda mais que a
  espera.
- **Imagens:** `ImagemProgressiva` — `loading="lazy"`, `decoding="async"` e transição de
  opacidade sobre fundo cinza, para a foto não "estalar" na tela.

### Progresso em ação

`Botao` aceita `carregando` (+ `rotuloCarregando`): troca o conteúdo por um indicador e
bloqueia o botão. Sem isso, um clique em "Salvar" numa conexão lenta não devolve sinal e o
usuário envia a mesma coisa duas vezes.

---

## Os únicos loops permitidos

Animação em loop cansa e prejudica acessibilidade. Existem exatamente quatro no sistema, e
**todas presas a um estado pendente real**, sumindo quando ele termina:

`Esqueleto` (varredura) · `CarregandoRota` (barra) · `CarregandoSessao` (ícone) ·
`Botao` (spinner enquanto salva).

Não adicione ponto pulsante, anel brilhante ou botão "respirando" em estado ocioso.
