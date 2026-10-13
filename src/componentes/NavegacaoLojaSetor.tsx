import { useState, type ReactNode } from 'react'
import { ClipboardList, Inbox, Store, Tag, type LucideIcon } from 'lucide-react'
import { EsqueletoLista, EsqueletoCardOS } from './Esqueleto'
import { Paginacao } from './Paginacao'
import { atrasoEntrada } from '../utilitarios/atrasoEntrada'
import { useNavegacaoNiveis } from '../hooks/useNavegacaoNiveis'
import { acharNivel, montarItensNavegacao } from '../utilitarios/navegacaoNiveis'
import { ListaNavegacao, TrilhaNavegacao, type PassoTrilha } from './NavegacaoNiveis'

interface ItemComLojaSetor {
  id: number
  lojaId: number
  lojaNome: string
  setorId: number
  setorNome: string
}

interface NavegacaoLojaSetorProps<T extends ItemComLojaSetor> {
  // Já recortados pelos filtros do painel (tipo, status da fila, avançados).
  itens: T[]
  carregando: boolean
  mensagemVazio: string
  IconeVazio?: LucideIcon
  rotuloNavegacao: string
  rotuloQuantidade: (quantidade: number) => string
  // Selo vermelho do card: o que tem a máquina PARADA, que é o que o Gestor ataca
  // primeiro. Sem ele (OS finalizadas) o card mostra só a contagem.
  ehDestaque?: (item: T) => boolean
  rotuloDestaques?: (quantidade: number) => string
  // Só a lista final de um setor pagina: as abas que esvaziam com o fluxo não precisam,
  // mas o histórico de OS finalizadas de um setor cresce sem parar.
  tamanhoPagina?: number
  renderItem: (item: T) => ReactNode
}

// Loja → Setor → os itens daquele setor, cada um com a máquina (ou o item, em reparo) no
// card. Usado pelas abas de solicitações/OS do Gestor e pelas três abas do Técnico; a
// aba de preventivas do Gestor desce um nível a mais (SeletorPreventivas) com as mesmas
// peças (utilitarios/navegacaoNiveis.ts). Os cards saem dos próprios itens
// filtrados, então trocar o filtro, ou tratar o último item de um setor, sobe o Gestor
// de nível sozinho em vez de deixá-lo numa tela vazia.
export function NavegacaoLojaSetor<T extends ItemComLojaSetor>({
  itens,
  carregando,
  mensagemVazio,
  IconeVazio = Inbox,
  rotuloNavegacao,
  rotuloQuantidade,
  ehDestaque,
  rotuloDestaques,
  tamanhoPagina,
  renderItem,
}: NavegacaoLojaSetorProps<T>) {
  const { parametros, navegar } = useNavegacaoNiveis()

  const itensLoja = montarItensNavegacao(
    itens,
    (item) => item.lojaId,
    (item) => item.lojaNome,
    { obterIdFilho: (item) => item.setorId, ehDestaque },
  )
  const loja = acharNivel(itensLoja, parametros.get('loja'))

  const itensSetor = loja
    ? montarItensNavegacao(
        itens.filter((item) => item.lojaId === loja.id),
        (item) => item.setorId,
        (item) => item.setorNome,
        { ehDestaque },
      )
    : []
  const setor = acharNivel(itensSetor, parametros.get('setor'))
  const itensDoSetor = setor ? itens.filter((item) => item.setorId === setor.id) : []

  // Página volta para 1 ao entrar em outro setor -- ajuste durante a renderização, mesmo
  // padrão das listagens do Administrador. Clamp no total: o filtro pode encolher a lista.
  const [pagina, setPagina] = useState(1)
  const [setorDaPagina, setSetorDaPagina] = useState(setor?.id)
  if (setor?.id !== setorDaPagina) {
    setSetorDaPagina(setor?.id)
    setPagina(1)
  }
  const totalPaginas = tamanhoPagina
    ? Math.max(1, Math.ceil(itensDoSetor.length / tamanhoPagina))
    : 1
  const paginaAtual = Math.min(pagina, totalPaginas)
  const itensDaPagina = tamanhoPagina
    ? itensDoSetor.slice((paginaAtual - 1) * tamanhoPagina, paginaAtual * tamanhoPagina)
    : itensDoSetor

  if (carregando) {
    return (
      <EsqueletoLista quantidade={3}>
        <EsqueletoCardOS />
      </EsqueletoLista>
    )
  }

  if (itens.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-slate-200/60 bg-slate-50 px-4 py-8 text-center text-slate-400">
        <IconeVazio size={20} />
        <p className="max-w-sm text-xs">{mensagemVazio}</p>
      </div>
    )
  }

  const trilha: PassoTrilha[] = [{ rotulo: 'Lojas', destino: {} }]
  if (loja) {
    trilha.push({ rotulo: loja.nome, destino: { loja: loja.id } })
  }
  if (loja && setor) {
    trilha.push({ rotulo: setor.nome, destino: { loja: loja.id, setor: setor.id } })
  }

  return (
    <div className="flex flex-col gap-4">
      <TrilhaNavegacao rotulo={rotuloNavegacao} passos={trilha} aoNavegar={navegar} />

      {!loja && (
        <ListaNavegacao
          titulo="Escolha a loja"
          Icone={Store}
          itens={itensLoja}
          rotuloQuantidade={rotuloQuantidade}
          rotuloFilhos={(n) => (n === 1 ? '1 setor' : `${n} setores`)}
          rotuloDestaques={rotuloDestaques}
          tomDestaque="vermelho"
          aoEntrar={(item) => navegar({ loja: item.id })}
        />
      )}

      {loja && !setor && (
        <ListaNavegacao
          titulo="Escolha o setor"
          Icone={Tag}
          itens={itensSetor}
          rotuloQuantidade={rotuloQuantidade}
          rotuloDestaques={rotuloDestaques}
          tomDestaque="vermelho"
          aoEntrar={(item) => navegar({ loja: loja.id, setor: item.id })}
        />
      )}

      {loja && setor && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
            <ClipboardList size={16} className="text-marca-600" />
            <h2 className="font-display text-sm font-bold tracking-widest text-slate-800 uppercase">
              {setor.nome} · {rotuloQuantidade(setor.quantidade)}
            </h2>
          </div>
          {itensDaPagina.map((item, indice) => (
            <div key={item.id} style={atrasoEntrada(indice)} className="animate-surgir">
              {renderItem(item)}
            </div>
          ))}
          {totalPaginas > 1 && (
            <Paginacao pagina={paginaAtual} totalPaginas={totalPaginas} aoMudarPagina={setPagina} />
          )}
        </div>
      )}
    </div>
  )
}
