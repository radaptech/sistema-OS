import { Plus, Trash2 } from 'lucide-react'
import { CampoTexto } from './CampoTexto'
import { formatarMoeda } from '../utilitarios/formatarMoeda'
import { rotulosCustoOS } from '../utilitarios/rotulosCustoOS'
import type { TipoOS } from '../tipos/ordemServico'

// Uma TAREFA enquanto ela está no formulário: o que foi feito, as peças que consumiu e
// a mão de obra que cobrou. Os dois valores convivem na mesma linha de propósito — trocar
// duas peças são duas tarefas, não duas mãos de obra, e obrigar o Técnico a criar uma
// linha extra só para carregar a hora era o que a primeira versão fazia.
//
// Os valores são `number | undefined` porque o campo nasce vazio: com 0 no lugar do vazio
// o Técnico teria que apagar o zero antes de digitar, e um campo esquecido passaria como
// "custou zero" — que é um valor legítimo no fluxo (peça em garantia) e por isso não pode
// ser o padrão silencioso.
export interface ItemCustoFormulario {
  descricao: string
  custoManutencao: number | undefined
  // Opcional, e não `number | undefined` obrigatório: é assim que o Zod tipa a saída do
  // campo opcional, e exigir a chave presente aqui quebraria a atribuição do <Controller>.
  custoHoraTecnico?: number | undefined
}

export interface ErroItemCusto {
  descricao?: string
  custoManutencao?: string
  custoHoraTecnico?: string
}

interface CampoItensCustoProps {
  itens: ItemCustoFormulario[]
  aoMudar: (itens: ItemCustoFormulario[]) => void
  // Os campos são os mesmos em todo tipo (Valor Peças + Valor Mão de Obra); o tipo só
  // troca a instrução — em terceiros os valores são os da nota da empresa.
  tipo: TipoOS
  // Mensagem do array inteiro (ex: "lance ao menos uma tarefa").
  erro?: string
  errosPorItem?: (ErroItemCusto | undefined)[]
  desabilitado?: boolean
}

// Lista editável de tarefas: um botão de adicionar, uma lixeira por linha e o total somado
// ao lado. Componente burro de propósito (CLAUDE.md, "/src/componentes"): recebe o array e
// devolve o array novo, sem saber de React Hook Form. Quem liga nos dois formulários que o
// usam é um <Controller> no campo `itens`, então o mesmo componente serve o modal de
// encerramento (Técnico) e o de custos pendentes (Administrador) sem generics nem cast.
export function CampoItensCusto({
  itens,
  aoMudar,
  tipo,
  erro,
  errosPorItem,
  desabilitado = false,
}: CampoItensCustoProps) {
  // Os totais são sempre recalculados do array, nunca guardados: é a mesma regra do
  // servidor, que soma as tarefas que gravou em vez de aceitar um total do cliente.
  // Guardados aqui, passariam a poder discordar das linhas logo acima deles.
  const totalManutencao = itens.reduce((soma, item) => soma + (item.custoManutencao ?? 0), 0)
  const totalHoraTecnica = itens.reduce((soma, item) => soma + (item.custoHoraTecnico ?? 0), 0)
  const total = totalManutencao + totalHoraTecnica

  function adicionar() {
    aoMudar([
      ...itens,
      { descricao: '', custoManutencao: undefined, custoHoraTecnico: undefined },
    ])
  }

  function remover(indice: number) {
    aoMudar(itens.filter((_, i) => i !== indice))
  }

  function alterar(indice: number, campo: Partial<ItemCustoFormulario>) {
    aoMudar(itens.map((item, i) => (i === indice ? { ...item, ...campo } : item)))
  }

  // Campo limpo volta a undefined, não a NaN: NaN passaria pelo Zod como "número" e
  // chegaria no servidor como valor inválido.
  function lerValor(valor: string, valorNumerico: number) {
    return valor === '' ? undefined : valorNumerico
  }

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 pt-5">
      <div className="flex items-center justify-between">
        <label className="text-marca-500 font-mono text-xs font-semibold tracking-wider uppercase">
          Custos *
        </label>
        <button
          type="button"
          onClick={adicionar}
          disabled={desabilitado}
          className="text-marca-800 flex items-center gap-1 text-xs font-semibold hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
        >
          <Plus size={14} />
          Adicionar custo
        </button>
      </div>

      <p className="text-xs text-slate-400">
        {tipo === 'terceiros'
          ? 'Uma linha por serviço da empresa, separando o valor das peças e o da mão de obra, como vem na nota fiscal dela.'
          : 'Uma linha por serviço feito, com a peça e a mão de obra dele. Se a OS trocou duas peças, lance as duas separadas — é assim que dá para conferir cada uma contra a nota depois.'}
      </p>

      {itens.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-4 text-center text-xs text-slate-400">
          Nenhum custo lançado. Adicione ao menos um para continuar.
        </p>
      )}

      {itens.map((item, indice) => {
        const erroItem = errosPorItem?.[indice]
        return (
          <div
            key={indice}
            className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <CampoTexto
                  rotulo="Descrição *"
                  placeholder="Ex: Troca do rolamento"
                  maxLength={120}
                  disabled={desabilitado}
                  value={item.descricao}
                  onChange={(evento) => alterar(indice, { descricao: evento.target.value })}
                  mensagemErro={erroItem?.descricao}
                />
              </div>
              {/* mt-6 alinha a lixeira com o input, não com o rótulo acima dele. */}
              <button
                type="button"
                aria-label={`Remover custo ${indice + 1}`}
                onClick={() => remover(indice)}
                disabled={desabilitado}
                className="mt-6 p-2.5 text-red-400 transition hover:text-red-600 disabled:cursor-not-allowed disabled:text-slate-300"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* items-end: se um rótulo quebrar em duas linhas, os inputs continuam
                alinhados pela base em vez de um descer sozinho. */}
            <div className="grid grid-cols-2 items-end gap-3">
              <CampoTexto
                rotulo={`${rotulosCustoOS.material} (R$) *`}
                type="number"
                min={0}
                step="0.01"
                placeholder="Ex: 180.00"
                disabled={desabilitado}
                value={item.custoManutencao ?? ''}
                onChange={(evento) =>
                  alterar(indice, {
                    custoManutencao: lerValor(evento.target.value, evento.target.valueAsNumber),
                  })
                }
                mensagemErro={erroItem?.custoManutencao}
              />

              {/* Sem asterisco: a tarefa pode ser só peça, sem mão de obra cobrada. */}
              <CampoTexto
                rotulo={`${rotulosCustoOS.maoDeObra} (R$)`}
                type="number"
                min={0}
                step="0.01"
                placeholder="Ex: 90.00"
                disabled={desabilitado}
                value={item.custoHoraTecnico ?? ''}
                onChange={(evento) =>
                  alterar(indice, {
                    custoHoraTecnico: lerValor(evento.target.value, evento.target.valueAsNumber),
                  })
                }
                mensagemErro={erroItem?.custoHoraTecnico}
              />
            </div>
          </div>
        )
      })}

      {erro && <span className="text-xs font-medium text-red-500">{erro}</span>}

      {itens.length > 0 && (
        <div className="flex flex-col gap-1 rounded-lg bg-lime-100 px-3 py-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-marca-800 font-mono tracking-wide uppercase">
              {rotulosCustoOS.material}
            </span>
            <span className="text-marca-800 font-mono">{formatarMoeda(totalManutencao)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-marca-800 font-mono tracking-wide uppercase">
              {rotulosCustoOS.maoDeObra}
            </span>
            <span className="text-marca-800 font-mono">{formatarMoeda(totalHoraTecnica)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-marca-800 font-mono text-xs font-semibold tracking-wide uppercase">
              Custo Total
            </span>
            <span className="text-marca-800 font-mono text-sm font-bold">
              {formatarMoeda(total)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
