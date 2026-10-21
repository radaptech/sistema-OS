import { useState } from 'react'
import { ChevronLeft, ChevronRight, Wallet } from 'lucide-react'
import { Esqueleto } from '../../../componentes/Esqueleto'
import { useCustosDoMes } from '../../../hooks/useCustosDoMes'
import { agoraParaBackend } from '../../../utilitarios/dataBackend'
import { formatarMoeda } from '../../../utilitarios/formatarMoeda'
import type { CustosDoMes } from '../../../tipos/custosDoMes'
import { ListaCustosPorTecnico } from './ListaCustosPorTecnico'

// "MM/AAAA" do mês de hoje — o mesmo rótulo que o servidor recebe e devolve.
function mesAtual(): string {
  return agoraParaBackend().slice(3, 10)
}

function deslocarMes(mes: string, meses: number): string {
  const [mm, aaaa] = mes.split('/').map(Number)
  const data = new Date(aaaa, mm - 1 + meses, 1)
  return `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`
}

function nomeDoMes(mes: string): string {
  const [mm, aaaa] = mes.split('/').map(Number)
  const nome = new Date(aaaa, mm - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
  return nome.charAt(0).toUpperCase() + nome.slice(1)
}

// Ordem fixa (a da barra e a das linhas). Cores conferidas no validador da skill de dataviz,
// no tema claro e no escuro, com um hex só para os dois, como no GraficoBarras do Dashboard.
// Cada linha repete o nome e o valor em texto, então a parcela nunca depende só da cor.
const PARCELAS = [
  {
    nome: 'Mão de obra dos técnicos',
    cor: '#008300',
    valor: (custos: CustosDoMes) => custos.maoDeObraTecnicos,
    detalhe: () => null,
  },
  {
    nome: 'Terceiros',
    cor: '#7a6be0',
    valor: (custos: CustosDoMes) => custos.terceiros,
    // A fatura inteira da empresa: sem esse aviso o Gestor procuraria as peças dela em "Peças".
    detalhe: (custos: CustosDoMes) =>
      `${custos.quantidadeOsTerceiros === 1 ? '1 OS' : `${custos.quantidadeOsTerceiros} OS`} · peças + mão de obra da empresa`,
  },
  {
    nome: 'Peças',
    cor: '#e2602d',
    valor: (custos: CustosDoMes) => custos.pecas,
    detalhe: () => 'das OS feitas pelos técnicos',
  },
] as const

function porcentagem(parte: number, total: number): string {
  return total > 0 ? `${Math.round((parte / total) * 100)}%` : '0%'
}

// "Custos do mês" no topo do Painel do Gestor: quanto as OS encerradas no mês custaram nos
// setores dele, separado em mão de obra dos técnicos, terceiros e peças, e a mão de obra de
// cada técnico. O mês é navegado pelas setas (nunca além do mês corrente) e fica no estado
// local, não na URL: o painel troca a query inteira ao mudar de aba (`setParametros({ aba })`)
// e apagaria o mês escolhido.
export function CardCustosDoMes() {
  const [mes, setMes] = useState(mesAtual)
  const { data: custos, isPending, isError } = useCustosDoMes(mes)
  const ehMesAtual = mes === mesAtual()

  return (
    <section
      aria-labelledby="titulo-custos-do-mes"
      className="shadow-card flex flex-col gap-4 rounded-2xl bg-white p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="titulo-custos-do-mes"
          className="flex shrink-0 items-center gap-2 font-mono text-[10px] font-bold tracking-widest whitespace-nowrap text-slate-500 uppercase"
        >
          <span className="bg-marca-600 flex h-6 w-6 items-center justify-center rounded-md text-white">
            <Wallet size={12} />
          </span>
          Custos do mês
        </h2>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMes((atual) => deslocarMes(atual, -1))}
            aria-label="Mês anterior"
            className="duration-rapido flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ChevronLeft size={18} />
          </button>
          <span
            aria-live="polite"
            className="min-w-32 text-center text-sm font-semibold text-slate-700"
          >
            {nomeDoMes(mes)}
          </span>
          <button
            type="button"
            onClick={() => setMes((atual) => deslocarMes(atual, 1))}
            disabled={ehMesAtual}
            aria-label="Próximo mês"
            className="duration-rapido flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {isPending && (
        <div
          role="status"
          aria-busy="true"
          aria-label="Carregando custos do mês"
          className="flex flex-col gap-3"
        >
          <Esqueleto className="h-8 w-40" />
          <Esqueleto className="h-2 w-full" />
          <Esqueleto className="h-5 w-full" />
          <Esqueleto className="h-5 w-full" />
          <Esqueleto className="h-5 w-full" />
        </div>
      )}

      {isError && !custos && (
        <p className="text-sm text-slate-500">
          Não foi possível carregar os custos do mês.
        </p>
      )}

      {custos && <ConteudoCustosDoMes custos={custos} />}
    </section>
  )
}

function ConteudoCustosDoMes({ custos }: { custos: CustosDoMes }) {
  if (custos.quantidadeOs === 0) {
    return (
      <p className="text-sm text-slate-500">Nenhuma OS encerrada neste mês.</p>
    )
  }

  const comValor = PARCELAS.filter((parcela) => parcela.valor(custos) > 0)

  return (
    <>
      <div>
        <p className="font-mono text-2xl font-bold text-slate-900 sm:text-3xl">
          {formatarMoeda(custos.custoTotal)}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          em{' '}
          {custos.quantidadeOs === 1
            ? '1 OS encerrada'
            : `${custos.quantidadeOs} OS encerradas`}
        </p>
      </div>

      {/* Parte do todo. O vão de 2px entre as parcelas é o fundo do card aparecendo (gap), e
          só entram as parcelas com valor: segmento de largura zero viraria um vão a mais. */}
      {comValor.length > 0 && (
        <div className="flex h-2 w-full gap-0.5" aria-hidden="true">
          {comValor.map((parcela) => (
            <span
              key={parcela.nome}
              title={`${parcela.nome}: ${formatarMoeda(parcela.valor(custos))} (${porcentagem(parcela.valor(custos), custos.custoTotal)})`}
              className="h-full first:rounded-l last:rounded-r"
              style={{
                backgroundColor: parcela.cor,
                width: `${(parcela.valor(custos) / custos.custoTotal) * 100}%`,
              }}
            />
          ))}
        </div>
      )}

      <ul className="flex flex-col gap-2.5">
        {PARCELAS.map((parcela) => {
          const valor = parcela.valor(custos)
          const detalhe = parcela.detalhe(custos)
          return (
            <li
              key={parcela.nome}
              className="flex items-start justify-between gap-3"
            >
              <div className="flex min-w-0 items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: parcela.cor }}
                />
                <div className="min-w-0">
                  <p className="text-sm text-slate-700">{parcela.nome}</p>
                  {detalhe && (
                    <p className="text-xs text-slate-400">{detalhe}</p>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-sm font-bold text-slate-800">
                  {formatarMoeda(valor)}
                </p>
                <p className="font-mono text-[11px] text-slate-400">
                  {porcentagem(valor, custos.custoTotal)}
                </p>
              </div>
            </li>
          )
        })}
      </ul>

      <ListaCustosPorTecnico tecnicos={custos.porTecnico} />
    </>
  )
}
