import { CirclePlus, ClipboardList } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CabecalhoTopo } from '../../componentes/CabecalhoTopo'
import { CardAcao } from '../../componentes/CardAcao'
import { CardEstatistica } from './componentes/CardEstatistica'
import { useResumoSolicitacoes } from '../../hooks/useResumoSolicitacoes'

export function HomeSolicitante() {
  const navegar = useNavigate()
  const { data: resumo } = useResumoSolicitacoes()

  const estatisticas = [
    { valor: resumo?.abertas ?? 0, rotulo: 'Abertas' },
    { valor: resumo?.emAndamento ?? 0, rotulo: 'Em andamento' },
    { valor: resumo?.concluidas ?? 0, rotulo: 'Concluídas' },
  ]

  return (
    <div className="flex min-h-svh flex-col bg-slate-50">
      <CabecalhoTopo />

      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-10">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            O que deseja fazer?
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Selecione uma das opções abaixo para continuar.
          </p>
        </div>

        <div className="flex w-full max-w-md flex-col gap-4">
          <CardAcao
            titulo="Minhas Solicitações"
            descricao="Veja todas as OS que você enviou"
            Icone={ClipboardList}
            aoClicar={() => navegar('/minhas-solicitacoes')}
          />
          {/* Os tipos de OS deixaram de ser caminhos daqui: o Solicitante escolhe
              Maquinário ou Pequenos Reparos dentro do próprio formulário. */}
          <CardAcao
            titulo="Nova Solicitação"
            descricao="Maquinário ou Pequenos Reparos"
            Icone={CirclePlus}
            variante="destaque"
            aoClicar={() => navegar('/nova-solicitacao')}
          />
        </div>

        <div className="grid w-full max-w-md grid-cols-3 gap-2 sm:gap-3">
          {estatisticas.map((estatistica) => (
            <CardEstatistica key={estatistica.rotulo} {...estatistica} />
          ))}
        </div>
      </main>

      <footer className="py-4 text-center">
        <span className="font-mono text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
          Solicitação OS © {new Date().getFullYear()}
        </span>
      </footer>
    </div>
  )
}
