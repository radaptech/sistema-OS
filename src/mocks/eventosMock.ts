import type { DetalhesEventoOS, EventoOrdemServico, TipoEventoOS } from '../tipos/eventoOrdemServico'
import type { OrdemServico, StatusExecucaoOS } from '../tipos/ordemServico'
import { usuarios } from './bancoMock'

// Correções de custo do Administrador, a única coisa do histórico que não dá para derivar do
// estado atual da OS (a correção sobrescreve o custo). Chave = id da OS.
const correcoesDeCusto = new Map<number, EventoOrdemServico[]>()

export function registrarCorrecaoDeCusto(
  ordem: OrdemServico,
  autor: { id: number; nome: string },
): void {
  const custo = ordem.custo
  if (!custo) {
    return
  }

  const lista = correcoesDeCusto.get(ordem.id) ?? []
  lista.push({
    id: 900_000 + lista.length + ordem.id * 100,
    tipo: 'custo_corrigido',
    usuarioId: autor.id,
    usuarioNome: autor.nome,
    usuarioPerfil: 'administrador',
    statusAnterior: null,
    statusNovo: null,
    detalhes: {
      itens: custo.itens,
      temNotaFiscal: custo.temNotaFiscal,
      notasFiscais: custo.notasFiscais,
      descricaoServicoTerceiro: custo.descricaoServicoTerceiro ?? null,
      custoManutencao: custo.custoManutencao,
      custoHoraTecnico: custo.custoHoraTecnico,
      custoTotal: custo.custoTotal,
    },
    ocorridoEm: custo.lancadoEm,
  })
  correcoesDeCusto.set(ordem.id, lista)
}

function evento(
  ordem: OrdemServico,
  sequencia: number,
  tipo: TipoEventoOS,
  autor: { id: number | null; nome: string | null; perfil: string | null },
  ocorridoEm: string,
  estados: [StatusExecucaoOS | null, StatusExecucaoOS | null] = [null, null],
  detalhes: DetalhesEventoOS | null = null,
): EventoOrdemServico {
  return {
    id: ordem.id * 100 + sequencia,
    tipo,
    usuarioId: autor.id,
    usuarioNome: autor.nome,
    usuarioPerfil: autor.perfil,
    statusAnterior: estados[0],
    statusNovo: estados[1],
    detalhes,
    ocorridoEm,
  }
}

// O servidor grava cada passo na própria transação; o mock monta a mesma linha do tempo a
// partir do estado da OS (abertura, início, pausas, terceiro, encerramento) e acrescenta as
// correções de custo guardadas acima. A ordem é a do servidor: por instante.
export function montarHistoricoMock(ordem: OrdemServico): EventoOrdemServico[] {
  const tecnico = {
    id: ordem.tecnicoId ?? null,
    nome: ordem.tecnicoNome ?? null,
    perfil: 'tecnico',
  }
  const eventos: EventoOrdemServico[] = []

  // Preventiva abre sem autor: ninguém pediu, foi o calendário.
  const abertaPorCalendario = !ordem.solicitanteNome
  const gestor = usuarios.find((u) => u.perfil === 'gestor')
  eventos.push(
    evento(
      ordem,
      1,
      'aberta',
      abertaPorCalendario
        ? { id: null, nome: null, perfil: null }
        : { id: gestor?.id ?? null, nome: gestor?.nome ?? null, perfil: 'gestor' },
      ordem.dataAbertura,
      [null, 'Aberta'],
      {
        origem: abertaPorCalendario ? 'preventiva' : 'solicitante',
        urgencia: ordem.urgencia,
      },
    ),
  )

  if (ordem.dataInicio) {
    eventos.push(evento(ordem, 2, 'iniciada', tecnico, ordem.dataInicio, ['Aberta', 'Em Andamento']))
  }

  ;(ordem.pausas ?? []).forEach((pausa, indice) => {
    eventos.push(
      evento(ordem, 10 + indice * 2, 'pausada', tecnico, pausa.pausadaEm, [pausa.statusAnterior, 'Pausada'], {
        motivo: pausa.motivo,
      }),
    )
    if (pausa.retomadaEm) {
      eventos.push(
        evento(ordem, 11 + indice * 2, 'retomada', tecnico, pausa.retomadaEm, ['Pausada', pausa.statusAnterior]),
      )
    }
  })

  // Sem `terceiro_acionado`: o mock não guarda o instante do acionamento (a OS só carrega
  // a empresa), e inventar uma hora seria pior que omitir o passo.

  if (ordem.encerramento) {
    const custo = ordem.custo
    eventos.push(
      evento(
        ordem,
        50,
        'encerrada',
        { id: null, nome: ordem.encerramento.encerradoPorNome, perfil: 'tecnico' },
        ordem.dataFim ?? ordem.dataAbertura,
        ['Em Andamento', 'Concluída'],
        {
          tipoDefeito: ordem.tipoDefeito,
          ...(custo && {
            itens: custo.itens,
            temNotaFiscal: custo.temNotaFiscal,
            notasFiscais: custo.notasFiscais,
            custoManutencao: custo.custoManutencao,
            custoHoraTecnico: custo.custoHoraTecnico,
            custoTotal: custo.custoTotal,
          }),
        },
      ),
    )
  }

  eventos.push(...(correcoesDeCusto.get(ordem.id) ?? []))

  return eventos
}
