import { ArrowLeft, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { atrasoEntrada } from '../utilitarios/atrasoEntrada'
import { ImagemProgressiva } from './ImagemProgressiva'
import type { ItemNavegacao, NivelNavegacao } from '../utilitarios/navegacaoNiveis'

export interface PassoTrilha {
  rotulo: string
  destino: NivelNavegacao
}

interface TrilhaNavegacaoProps {
  rotulo: string
  passos: PassoTrilha[]
  aoNavegar: (destino: NivelNavegacao) => void
}

// Trilha clicável (Lojas › Loja › Setor ...) com botão de voltar um nível. Cada passo já
// percorrido leva de volta àquele nível; o último é onde o Gestor está.
export function TrilhaNavegacao({ rotulo, passos, aoNavegar }: TrilhaNavegacaoProps) {
  return (
    <nav aria-label={rotulo} className="flex items-center gap-2">
      {passos.length > 1 && (
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => aoNavegar(passos[passos.length - 2].destino)}
          className="text-marca-800 shadow-card hover:shadow-card-hover flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white transition"
        >
          <ArrowLeft size={16} />
        </button>
      )}
      <ol className="flex min-w-0 flex-wrap items-center gap-1 text-xs">
        {passos.map((passo, indice) => {
          const atual = indice === passos.length - 1
          return (
            <li key={passo.rotulo + indice} className="flex min-w-0 items-center gap-1">
              {indice > 0 && <ChevronRight size={12} className="shrink-0 text-slate-300" />}
              {atual ? (
                <span className="max-w-[16rem] truncate font-semibold text-slate-800">
                  {passo.rotulo}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => aoNavegar(passo.destino)}
                  className="text-marca-800 max-w-[16rem] truncate font-medium hover:underline"
                >
                  {passo.rotulo}
                </button>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

interface ListaNavegacaoProps {
  titulo: string
  Icone: LucideIcon
  itens: ItemNavegacao[]
  rotuloQuantidade: (quantidade: number) => string
  rotuloFilhos?: (quantidade: number) => string
  rotuloDestaques?: (quantidade: number) => string
  // Âmbar para "precisa de atenção" (preventiva vencida), vermelho para urgente
  // (solicitação que afeta produção).
  tomDestaque?: 'ambar' | 'vermelho'
  aoEntrar: (item: ItemNavegacao) => void
}

export function ListaNavegacao({
  titulo,
  Icone,
  itens,
  rotuloQuantidade,
  rotuloFilhos,
  rotuloDestaques,
  tomDestaque = 'ambar',
  aoEntrar,
}: ListaNavegacaoProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-sm font-bold tracking-widest text-slate-800 uppercase">
        {titulo}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {itens.map((item, indice) => (
          <button
            key={item.id}
            type="button"
            onClick={() => aoEntrar(item)}
            style={atrasoEntrada(indice)}
            className="animate-surgir group shadow-card hover:shadow-card-hover flex items-center gap-3 rounded-2xl bg-white p-4 text-left transition-shadow duration-200"
          >
            {item.fotoUrl ? (
              <ImagemProgressiva
                src={item.fotoUrl}
                alt={item.nome}
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <span className="bg-marca-600 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white">
                <Icone size={18} />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-slate-800">{item.nome}</span>
              {item.detalhe && (
                <span className="block truncate text-xs text-slate-500">{item.detalhe}</span>
              )}
              <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-slate-400">
                {item.filhos !== undefined && rotuloFilhos && (
                  <span>{rotuloFilhos(item.filhos)} ·</span>
                )}
                <span>{rotuloQuantidade(item.quantidade)}</span>
                {item.destaques > 0 && rotuloDestaques && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      tomDestaque === 'vermelho'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {rotuloDestaques(item.destaques)}
                  </span>
                )}
              </span>
            </span>
            <ChevronRight
              size={18}
              className="group-hover:text-marca-600 shrink-0 text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </button>
        ))}
      </div>
    </div>
  )
}
