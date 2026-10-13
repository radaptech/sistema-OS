import { CalendarClock, Cog, Inbox, Store, Tag } from 'lucide-react'
import { EsqueletoLista, EsqueletoCardOS } from '../../../componentes/Esqueleto'
import { atrasoEntrada } from '../../../utilitarios/atrasoEntrada'
import type { Loja } from '../../../tipos/loja'
import type { PreventivaListada } from '../../../tipos/maquina'
import { ListaNavegacao, TrilhaNavegacao, type PassoTrilha } from '../../../componentes/NavegacaoNiveis'
import { useNavegacaoNiveis } from '../../../hooks/useNavegacaoNiveis'
import { acharNivel, montarItensNavegacao } from '../../../utilitarios/navegacaoNiveis'
import { CardPreventiva } from './CardPreventiva'
import { HistoricoPreventiva } from './HistoricoPreventiva'

function rotuloPreventivas(quantidade: number) {
  return quantidade === 1 ? '1 preventiva' : `${quantidade} preventivas`
}

function rotuloVencidas(quantidade: number) {
  return quantidade === 1 ? '1 vencida' : `${quantidade} vencidas`
}

interface SeletorPreventivasProps {
  preventivas: PreventivaListada[]
  lojas: Loja[]
  carregando: boolean
}

// Aba "Manutenção Prev." do Gestor: em vez de despejar todas as preventivas de uma vez,
// o Gestor entra numa loja, depois num setor, depois numa máquina, vê as preventivas
// dela e, clicando numa, o histórico de ciclos. Os itens saem das próprias preventivas,
// que o servidor já devolve restritas ao escopo do Gestor.
export function SeletorPreventivas({ preventivas, lojas, carregando }: SeletorPreventivasProps) {
  const { parametros, navegar } = useNavegacaoNiveis()
  const ehVencida = (preventiva: PreventivaListada) => Boolean(preventiva.vencida)

  const itensLoja = montarItensNavegacao(
    preventivas,
    (preventiva) => preventiva.lojaId,
    (preventiva) =>
      preventiva.lojaNome ??
      lojas.find((loja) => loja.id === preventiva.lojaId)?.nome ??
      `Loja ${preventiva.lojaId}`,
    { obterIdFilho: (preventiva) => preventiva.setorId, ehDestaque: ehVencida },
  )
  const loja = acharNivel(itensLoja, parametros.get('loja'))

  const itensSetor = loja
    ? montarItensNavegacao(
        preventivas.filter((preventiva) => preventiva.lojaId === loja.id),
        (preventiva) => preventiva.setorId,
        (preventiva) => preventiva.setorNome,
        { obterIdFilho: (preventiva) => preventiva.maquinaId, ehDestaque: ehVencida },
      )
    : []
  const setor = acharNivel(itensSetor, parametros.get('setor'))

  const itensMaquina = setor
    ? montarItensNavegacao(
        preventivas.filter((preventiva) => preventiva.setorId === setor.id),
        (preventiva) => preventiva.maquinaId,
        (preventiva) => preventiva.maquinaNome,
        { ehDestaque: ehVencida },
      )
    : []
  const maquina = acharNivel(itensMaquina, parametros.get('maquina'))

  const preventivasDaMaquina = maquina
    ? preventivas.filter((preventiva) => preventiva.maquinaId === maquina.id)
    : []
  const preventiva = acharNivel(preventivasDaMaquina, parametros.get('preventiva'))

  if (carregando) {
    return (
      <EsqueletoLista quantidade={3}>
        <EsqueletoCardOS />
      </EsqueletoLista>
    )
  }

  if (preventivas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-slate-200/60 bg-slate-50 py-8 text-center text-slate-400">
        <Inbox size={20} />
        <p className="text-xs">Nenhuma preventiva cadastrada nos seus setores.</p>
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
      rotulo: maquina.nome,
      destino: { loja: loja.id, setor: setor.id, maquina: maquina.id },
    })
  }
  if (loja && setor && maquina && preventiva) {
    trilha.push({
      rotulo: preventiva.descricao,
      destino: { loja: loja.id, setor: setor.id, maquina: maquina.id, preventiva: preventiva.id },
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <TrilhaNavegacao rotulo="Navegação das preventivas" passos={trilha} aoNavegar={navegar} />

      {!loja && (
        <ListaNavegacao
          titulo="Escolha a loja"
          Icone={Store}
          itens={itensLoja}
          rotuloQuantidade={rotuloPreventivas}
          rotuloFilhos={(n) => (n === 1 ? '1 setor' : `${n} setores`)}
          rotuloDestaques={rotuloVencidas}
          aoEntrar={(item) => navegar({ loja: item.id })}
        />
      )}

      {loja && !setor && (
        <ListaNavegacao
          titulo="Escolha o setor"
          Icone={Tag}
          itens={itensSetor}
          rotuloQuantidade={rotuloPreventivas}
          rotuloFilhos={(n) => (n === 1 ? '1 máquina' : `${n} máquinas`)}
          rotuloDestaques={rotuloVencidas}
          aoEntrar={(item) => navegar({ loja: loja.id, setor: item.id })}
        />
      )}

      {loja && setor && !maquina && (
        <ListaNavegacao
          titulo="Escolha a máquina"
          Icone={Cog}
          itens={itensMaquina}
          rotuloQuantidade={rotuloPreventivas}
          rotuloDestaques={rotuloVencidas}
          aoEntrar={(item) => navegar({ loja: loja.id, setor: setor.id, maquina: item.id })}
        />
      )}

      {loja && setor && maquina && !preventiva && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
            <CalendarClock size={16} className="text-marca-600" />
            <h2 className="font-display text-sm font-bold tracking-widest text-slate-800 uppercase">
              {maquina.nome} · {rotuloPreventivas(maquina.quantidade)}
            </h2>
          </div>
          {preventivasDaMaquina.map((item, indice) => (
            <div key={item.id} style={atrasoEntrada(indice)} className="animate-surgir">
              <CardPreventiva
                preventiva={item}
                aoClicar={() =>
                  navegar({ loja: loja.id, setor: setor.id, maquina: maquina.id, preventiva: item.id })
                }
              />
            </div>
          ))}
        </div>
      )}

      {preventiva && <HistoricoPreventiva preventiva={preventiva} />}
    </div>
  )
}
