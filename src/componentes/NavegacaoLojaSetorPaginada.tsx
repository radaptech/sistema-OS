import { useState, type ReactNode } from 'react'
import { ClipboardList, Inbox, Store, Tag, type LucideIcon } from 'lucide-react'
import { EsqueletoCardOS, EsqueletoLista } from './Esqueleto'
import { ListaNavegacao, TrilhaNavegacao, type PassoTrilha } from './NavegacaoNiveis'
import { Paginacao } from './Paginacao'
import { useNavegacaoNiveis } from '../hooks/useNavegacaoNiveis'
import { useLojas } from '../hooks/useLojas'
import { useOrdensServicoPaginadas } from '../hooks/useOrdensServicoPaginadas'
import { useResumoOrdensServico } from '../hooks/useResumoOrdensServico'
import { useSetores } from '../hooks/useSetores'
import { atrasoEntrada } from '../utilitarios/atrasoEntrada'
import { acharNivel, type ItemNavegacao } from '../utilitarios/navegacaoNiveis'
import type { ParametrosListagemOrdensServico, ResumoOrdensServicoSetor } from '../servicos/servicoOrdensServico'
import type { OrdemServico } from '../tipos/ordemServico'

interface NavegacaoLojaSetorPaginadaProps {
  // Filtros da lista E do resumo -- os mesmos nas duas chamadas, senão o card diria uma
  // quantidade e a página mostraria outra. Sem `setorId` e `pagina`: quem põe é o componente.
  filtros: ParametrosListagemOrdensServico
  mensagemVazio: string
  IconeVazio?: LucideIcon
  rotuloNavegacao: string
  renderItem: (ordem: OrdemServico) => ReactNode
}

function rotuloOS(quantidade: number) {
  return quantidade === 1 ? '1 OS' : `${quantidade} OS`
}

// Loja → Setor → cards daquele setor, com a lista PAGINADA NO SERVIDOR. É para histórico que só
// cresce (OS Finalizadas do Gestor, OS Concluídas do Técnico): a tela não baixa o escopo inteiro.
// Os cards de loja e setor saem de um resumo (GET /ordens-servico/resumo) e só o setor aberto
// busca a página atual (GET /ordens-servico?setorId=&pagina=). A soma do resumo é o total da
// lista com os mesmos filtros, então o card e a página nunca discordam. Nível e página moram:
// o nível na URL (?loja=&setor=), a página em estado, que volta para 1 ao trocar de setor ou de
// filtro. Irmão de NavegacaoLojaSetor, que recebe a lista inteira pronta.
export function NavegacaoLojaSetorPaginada({
  filtros,
  mensagemVazio,
  IconeVazio = Inbox,
  rotuloNavegacao,
  renderItem,
}: NavegacaoLojaSetorPaginadaProps) {
  const { parametros: urlParametros, navegar } = useNavegacaoNiveis()
  const { data: lojasCadastradas = [] } = useLojas()
  const { data: setoresCadastrados = [] } = useSetores()

  const { data: resumo = [], isLoading: carregandoResumo } = useResumoOrdensServico(filtros)

  const itensLoja = montarItensLoja(resumo, (id) => lojasCadastradas.find((l) => l.id === id)?.fotoUrl)
  const loja = acharNivel(itensLoja, urlParametros.get('loja'))
  const itensSetor = loja
    ? montarItensSetor(resumo, loja.id, (id) => setoresCadastrados.find((s) => s.id === id)?.fotoUrl)
    : []
  const setor = acharNivel(itensSetor, urlParametros.get('setor'))

  // Página volta para 1 ao entrar em outro setor ou mudar um filtro — ajuste durante a
  // renderização, mesmo padrão das listagens do Administrador.
  const chave = `${setor?.id ?? ''}|${JSON.stringify(filtros)}`
  const [pagina, setPagina] = useState(1)
  const [chaveDaPagina, setChaveDaPagina] = useState(chave)
  if (chave !== chaveDaPagina) {
    setChaveDaPagina(chave)
    setPagina(1)
  }

  const { data: dadosPagina, isLoading: carregandoPagina } = useOrdensServicoPaginadas(
    { ...filtros, setorId: setor?.id, pagina },
    Boolean(setor),
  )
  const totalPaginas = Math.max(1, dadosPagina?.totalPaginas ?? 1)
  // A lista pode encolher (filtro, OS que saiu): uma página além da última voltaria vazia.
  if (dadosPagina && pagina > totalPaginas) {
    setPagina(totalPaginas)
  }

  if (carregandoResumo) {
    return (
      <EsqueletoLista quantidade={3}>
        <EsqueletoCardOS />
      </EsqueletoLista>
    )
  }

  if (resumo.length === 0) {
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

  const ordens = dadosPagina?.dados ?? []

  return (
    <div className="flex flex-col gap-4">
      <TrilhaNavegacao rotulo={rotuloNavegacao} passos={trilha} aoNavegar={navegar} />

      {!loja && (
        <ListaNavegacao
          titulo="Escolha a loja"
          Icone={Store}
          itens={itensLoja}
          rotuloQuantidade={rotuloOS}
          rotuloFilhos={(n) => (n === 1 ? '1 setor' : `${n} setores`)}
          aoEntrar={(item) => navegar({ loja: item.id })}
        />
      )}

      {loja && !setor && (
        <ListaNavegacao
          titulo="Escolha o setor"
          Icone={Tag}
          itens={itensSetor}
          rotuloQuantidade={rotuloOS}
          aoEntrar={(item) => navegar({ loja: loja.id, setor: item.id })}
        />
      )}

      {loja && setor && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
            <ClipboardList size={16} className="text-marca-600" />
            <h2 className="font-display text-sm font-bold tracking-widest text-slate-800 uppercase">
              {setor.nome} · {rotuloOS(setor.quantidade)}
            </h2>
          </div>
          {carregandoPagina && (
            <EsqueletoLista quantidade={3}>
              <EsqueletoCardOS />
            </EsqueletoLista>
          )}
          {ordens.map((ordem, indice) => (
            <div key={ordem.id} style={atrasoEntrada(indice)} className="animate-surgir">
              {renderItem(ordem)}
            </div>
          ))}
          {totalPaginas > 1 && (
            <Paginacao pagina={pagina} totalPaginas={totalPaginas} aoMudarPagina={setPagina} />
          )}
        </div>
      )}
    </div>
  )
}

// Os cards saem das linhas do resumo (uma por setor), em ordem alfabética como os de
// `montarItensNavegacao` — o servidor já agrupou, aqui só se soma por loja.
function montarItensLoja(
  resumo: ResumoOrdensServicoSetor[],
  obterFoto: (lojaId: number) => string | undefined,
): ItemNavegacao[] {
  const lojas = new Map<number, ItemNavegacao>()
  for (const linha of resumo) {
    const atual = lojas.get(linha.lojaId) ?? {
      id: linha.lojaId,
      nome: linha.lojaNome,
      quantidade: 0,
      destaques: 0,
      filhos: 0,
      fotoUrl: obterFoto(linha.lojaId),
    }
    atual.quantidade += linha.quantidade
    atual.filhos = (atual.filhos ?? 0) + 1
    lojas.set(linha.lojaId, atual)
  }
  return [...lojas.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

function montarItensSetor(
  resumo: ResumoOrdensServicoSetor[],
  lojaId: number,
  obterFoto: (setorId: number) => string | undefined,
): ItemNavegacao[] {
  return resumo
    .filter((linha) => linha.lojaId === lojaId)
    .map((linha) => ({
      id: linha.setorId,
      nome: linha.setorNome,
      quantidade: linha.quantidade,
      destaques: 0,
      fotoUrl: obterFoto(linha.setorId),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}
