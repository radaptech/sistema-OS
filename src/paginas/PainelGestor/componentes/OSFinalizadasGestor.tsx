import { Inbox } from 'lucide-react'
import { NavegacaoLojaSetorPaginada } from '../../../componentes/NavegacaoLojaSetorPaginada'
import type { ParametrosListagemOrdensServico } from '../../../servicos/servicoOrdensServico'
import type { OrdemServico, TipoOS } from '../../../tipos/ordemServico'
import type { FiltrosAvancadosOS } from '../filtrosOS'
import { CardOSFinalizada } from './CardOSFinalizada'

interface OSFinalizadasGestorProps {
  filtroTipo: TipoOS | ''
  filtrosAvancados: FiltrosAvancadosOS
  aoVisualizar: (ordem: OrdemServico) => void
  aoImprimir: (ordem: OrdemServico) => void
}

function numeroOuUndefined(texto: string): number | undefined {
  return texto === '' ? undefined : Number(texto)
}

// Aba "OS Finalizadas" do Gestor: histórico paginado no servidor (NavegacaoLojaSetorPaginada),
// navegado Loja → Setor → Máquina — o histórico de um setor junta muitas máquinas, e o Gestor
// quer ver o de uma só. Os filtros do painel (tipo e avançados) vão ao servidor, porque a lista
// não está inteira na tela.
export function OSFinalizadasGestor({
  filtroTipo,
  filtrosAvancados,
  aoVisualizar,
  aoImprimir,
}: OSFinalizadasGestorProps) {
  const filtros: ParametrosListagemOrdensServico = {
    finalizada: true,
    tipo: filtroTipo || undefined,
    maquina: filtrosAvancados.maquina.trim() || undefined,
    lojaId: numeroOuUndefined(filtrosAvancados.loja),
    dataInicio: filtrosAvancados.dataInicio || undefined,
    dataFim: filtrosAvancados.dataFim || undefined,
    valorMinimo: numeroOuUndefined(filtrosAvancados.valorMinimo),
    valorMaximo: numeroOuUndefined(filtrosAvancados.valorMaximo),
  }

  return (
    <NavegacaoLojaSetorPaginada
      filtros={filtros}
      IconeVazio={Inbox}
      mensagemVazio="Nenhuma OS finalizada ainda — a OS só aparece aqui depois que o Técnico encerra o atendimento e o Administrador lança o custo de manutenção."
      rotuloNavegacao="Navegação das OS finalizadas"
      porMaquina
      renderItem={(ordem) => (
        <CardOSFinalizada ordemServico={ordem} aoVisualizar={aoVisualizar} aoImprimir={aoImprimir} />
      )}
    />
  )
}
