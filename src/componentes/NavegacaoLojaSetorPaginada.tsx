import { useState, type ReactNode } from 'react'
import { ClipboardList, Cog, Inbox, Store, Tag, type LucideIcon } from 'lucide-react'
import { EsqueletoCardOS, EsqueletoLista } from './Esqueleto'
import { ListaNavegacao, TrilhaNavegacao, type PassoTrilha } from './NavegacaoNiveis'
import { Paginacao } from './Paginacao'
import { useNavegacaoNiveis } from '../hooks/useNavegacaoNiveis'
import { useLojas } from '../hooks/useLojas'
import { useMaquinas } from '../hooks/useMaquinas'
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
  // Desce mais um nível, Setor → Máquina, antes da lista (OS Finalizadas do Gestor, OS
  // Concluídas do Técnico). Os pequenos reparos do setor, que não têm máquina, viram um card
  // próprio no fim.
  porMaquina?: boolean
  renderItem: (ordem: OrdemServico) => ReactNode
}

// Id do card de pequenos reparos no nível de máquina (?maquina=0 na URL): nenhuma máquina
// tem id 0, e a lista dele vai ao servidor como `reparo=true`, não como `maquinaId`.
const ID_REPAROS = 0

function rotuloOS(quantidade: number) {
  return quantidade === 1 ? '1 OS' : `${quantidade} OS`
}

// Loja → Setor → cards daquele setor, com a lista PAGINADA NO SERVIDOR. É para histórico que só
// cresce (OS Finalizadas do Gestor, OS Concluídas do Técnico): a tela não baixa o escopo inteiro.
// Os cards de loja e setor saem de um resumo (GET /ordens-servico/resumo) e só o setor aberto
// busca a página atual (GET /ordens-servico?setorId=&pagina=). A soma do resumo é o total da
// lista com os mesmos filtros, então o card e a página nunca discordam. Nível e página moram:
// o nível na URL (?loja=&setor=&maquina=), a página em estado, que volta para 1 ao trocar de
// setor/máquina ou de filtro. Irmão de NavegacaoLojaSetor, que recebe a lista inteira pronta.
export function NavegacaoLojaSetorPaginada({
  filtros,
  mensagemVazio,
  IconeVazio = Inbox,
  rotuloNavegacao,
  porMaquina = false,
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

  // A foto da máquina não vem no resumo: sai do cadastro do setor aberto, só no nível de
  // máquina. Máquina desativada não está lá e o card cai no ícone.
  const { data: maquinasDoSetor = [] } = useMaquinas(
    { setorId: setor?.id },
    porMaquina && Boolean(setor),
  )
  const itensMaquina =
    porMaquina && setor
      ? montarItensMaquina(resumo, setor.id, (id) => maquinasDoSetor.find((m) => m.id === id)?.fotoUrl)
      : []
  const maquina = acharNivel(itensMaquina, urlParametros.get('maquina'))
  // O nível que abre a lista: a máquina, ou o próprio setor quando não há nível de máquina.
  const nivelFinal = porMaquina ? maquina : setor
  const filtroMaquina: ParametrosListagemOrdensServico = !maquina
    ? {}
    : maquina.id === ID_REPAROS
      ? { reparo: true }
      : { maquinaId: maquina.id }

  // Página volta para 1 ao entrar em outro setor/máquina ou mudar um filtro — ajuste durante
  // a renderização, mesmo padrão das listagens do Administrador.
  const chave = `${setor?.id ?? ''}|${maquina?.id ?? ''}|${JSON.stringify(filtros)}`
  const [pagina, setPagina] = useState(1)
  const [chaveDaPagina, setChaveDaPagina] = useState(chave)
  if (chave !== chaveDaPagina) {
    setChaveDaPagina(chave)
    setPagina(1)
  }

  const { data: dadosPagina, isLoading: carregandoPagina } = useOrdensServicoPaginadas(
    { ...filtros, setorId: setor?.id, ...filtroMaquina, pagina },
    Boolean(nivelFinal),
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
  if (loja && setor && maquina) {
    trilha.push({
      rotulo: maquina.detalhe ? `${maquina.nome} · ${maquina.detalhe}` : maquina.nome,
      destino: { loja: loja.id, setor: setor.id, maquina: maquina.id },
    })
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
          rotuloFilhos={porMaquina ? (n) => (n === 1 ? '1 máquina' : `${n} máquinas`) : undefined}
          aoEntrar={(item) => navegar({ loja: loja.id, setor: item.id })}
        />
      )}

      {loja && setor && porMaquina && !maquina && (
        <ListaNavegacao
          titulo="Escolha a máquina"
          Icone={Cog}
          itens={itensMaquina}
          rotuloQuantidade={rotuloOS}
          aoEntrar={(item) => navegar({ loja: loja.id, setor: setor.id, maquina: item.id })}
        />
      )}

      {loja && setor && nivelFinal && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
            <ClipboardList size={16} className="text-marca-600" />
            <h2 className="font-display text-sm font-bold tracking-widest text-slate-800 uppercase">
              {nivelFinal.nome} · {rotuloOS(nivelFinal.quantidade)}
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

// Os cards saem das linhas do resumo (uma por máquina de cada setor, mais uma dos reparos):
// loja e setor somam as linhas, `filhos` conta os setores da loja e as máquinas do setor. Ordem
// alfabética como a de `montarItensNavegacao` — o servidor já agrupou, aqui só se soma.
function somarPor(
  linhas: ResumoOrdensServicoSetor[],
  obterId: (linha: ResumoOrdensServicoSetor) => number,
  obterNome: (linha: ResumoOrdensServicoSetor) => string,
  obterIdFilho: (linha: ResumoOrdensServicoSetor) => string,
  obterFoto: (id: number) => string | undefined,
): ItemNavegacao[] {
  const grupos = new Map<number, ItemNavegacao & { idsFilhos: Set<string> }>()
  for (const linha of linhas) {
    const id = obterId(linha)
    const atual = grupos.get(id) ?? {
      id,
      nome: obterNome(linha),
      quantidade: 0,
      destaques: 0,
      idsFilhos: new Set<string>(),
      fotoUrl: obterFoto(id),
    }
    atual.quantidade += linha.quantidade
    atual.idsFilhos.add(obterIdFilho(linha))
    grupos.set(id, atual)
  }
  return [...grupos.values()]
    .map(({ idsFilhos, ...grupo }) => ({ ...grupo, filhos: idsFilhos.size }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

function montarItensLoja(
  resumo: ResumoOrdensServicoSetor[],
  obterFoto: (lojaId: number) => string | undefined,
): ItemNavegacao[] {
  return somarPor(
    resumo,
    (linha) => linha.lojaId,
    (linha) => linha.lojaNome,
    (linha) => String(linha.setorId),
    obterFoto,
  )
}

function montarItensSetor(
  resumo: ResumoOrdensServicoSetor[],
  lojaId: number,
  obterFoto: (setorId: number) => string | undefined,
): ItemNavegacao[] {
  return somarPor(
    resumo.filter((linha) => linha.lojaId === lojaId),
    (linha) => linha.setorId,
    (linha) => linha.setorNome,
    (linha) => String(linha.maquinaId ?? ID_REPAROS),
    obterFoto,
  )
}

// Uma linha do resumo já é uma máquina. Máquinas iguais têm o mesmo nome, então o patrimônio
// vai na linha de detalhe e desempata a ordem; o card de reparos fica por último.
function montarItensMaquina(
  resumo: ResumoOrdensServicoSetor[],
  setorId: number,
  obterFoto: (maquinaId: number) => string | undefined,
): ItemNavegacao[] {
  const linhas = resumo.filter((linha) => linha.setorId === setorId)
  const maquinas: ItemNavegacao[] = linhas
    .filter((linha) => linha.maquinaId !== null)
    .map((linha) => ({
      id: linha.maquinaId as number,
      nome: linha.maquinaNome ?? 'Máquina',
      detalhe: linha.maquinaCodigo ? `Patrimônio ${linha.maquinaCodigo}` : undefined,
      quantidade: linha.quantidade,
      destaques: 0,
      fotoUrl: obterFoto(linha.maquinaId as number),
    }))
    .sort(
      (a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR') ||
        (a.detalhe ?? '').localeCompare(b.detalhe ?? '', 'pt-BR', { numeric: true }),
    )
  const reparos = linhas.find((linha) => linha.maquinaId === null)
  if (reparos) {
    maquinas.push({
      id: ID_REPAROS,
      nome: 'Pequenos reparos',
      detalhe: 'Itens sem máquina cadastrada',
      quantidade: reparos.quantidade,
      destaques: 0,
    })
  }
  return maquinas
}
