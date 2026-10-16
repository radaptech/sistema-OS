import type { ItemCustoOS, NotaFiscalOS, StatusExecucaoOS } from './ordemServico'

// Um passo da linha do tempo da OS (os_evento, migration 000021 do back): quem fez, quando
// e o que mudou. Escrito só pelo servidor, dentro da transação do próprio passo.
export const tiposEventoOS = [
  'aberta',
  'iniciada',
  'pausada',
  'retomada',
  'terceiro_acionado',
  'encerrada',
  'custo_corrigido',
] as const

export type TipoEventoOS = (typeof tiposEventoOS)[number]

// O estado do custo DEPOIS do passo. Guarda o "depois" e não o "antes" de propósito: a versão
// anterior de uma correção é o evento anterior, e o lançamento original do Técnico (que a
// correção do Administrador apaga das tabelas de itens e notas) fica no evento `encerrada`.
export interface SnapshotCustoOS {
  itens: ItemCustoOS[]
  temNotaFiscal: boolean
  notasFiscais: NotaFiscalOS[]
  descricaoServicoTerceiro?: string | null
  custoManutencao: number
  custoHoraTecnico: number | null
  custoTotal: number
}

// `detalhes` depende do tipo e pode vir null. `retroativo` marca o que foi reconstituído de
// colunas antigas quando o histórico nasceu: a autoria de iniciar/pausar/retomar/terceiro
// nesses casos é presumida (o técnico da OS), não registrada.
export interface DetalhesEventoOS extends Partial<SnapshotCustoOS> {
  retroativo?: boolean
  origem?: 'solicitante' | 'direta' | 'preventiva'
  urgencia?: string
  motivo?: string
  empresaTerceirizadaNome?: string | null
  tipoDefeito?: string
}

export interface EventoOrdemServico {
  id: number
  tipo: TipoEventoOS
  // Nulos só na abertura da OS de preventiva: ninguém abriu, foi o calendário.
  usuarioId: number | null
  usuarioNome: string | null
  usuarioPerfil: string | null
  statusAnterior: StatusExecucaoOS | null
  statusNovo: StatusExecucaoOS | null
  detalhes: DetalhesEventoOS | null
  ocorridoEm: string
}
