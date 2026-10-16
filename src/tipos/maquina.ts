import type { StatusExecucaoOS } from './ordemServico'

export const niveisCriticidade = ['Baixa', 'Média', 'Alta'] as const

export type NivelCriticidade = (typeof niveisCriticidade)[number]

export interface Maquina {
  id: number
  nome: string
  numeroPatrimonio?: string
  serie?: string
  descricao?: string
  marca?: string
  modelo?: string
  criticidade?: NivelCriticidade
  // Setor é um cadastro por loja (ver /src/tipos/setor.ts): a máquina referencia o id, e
  // loja/nome vêm resolvidos pelo servidor para não exigir uma segunda consulta na tela.
  setorId: number
  setorNome: string
  lojaId: number
  lojaNome?: string
  fotoUrl?: string
  ativa?: boolean
}

// GET /solicitacoes/minhas/maquinas: as máquinas que aparecem nas solicitações do próprio
// Solicitante (opções do filtro de Minhas Solicitações) — só o que o chip mostra.
export type MaquinaDasMinhasSolicitacoes = Pick<Maquina, 'id' | 'nome' | 'numeroPatrimonio' | 'fotoUrl'>

// GET /maquinas/:id/historico — o que a exclusão definitiva leva junto. emAberto é
// solicitação pendente ou OS não concluída: é o que impede a desativação.
export interface HistoricoMaquina {
  solicitacoes: number
  ordensServico: number
  notasFiscais: number
  preventivas: number
  emAberto: number
}

export interface PreventivaManutencao {
  maquinaId: number
  // Quem recebe a OS quando esta preventiva vencer. A preventiva não passa mais pela fila
  // do Gestor: ao vencer, o servidor abre a OS já atribuída a este técnico. Por isso o
  // campo é obrigatório no cadastro — sem ele não há para quem abrir.
  tecnicoId: number
  descricao: string
  intervaloDias: number
  proximaData: string
  ativa: boolean
}

export interface PreventivaListada extends PreventivaManutencao {
  id: number
  maquinaNome: string
  // Máquinas iguais têm o mesmo nome: é o patrimônio (com a foto) que diz ao Gestor qual
  // delas é, na aba "Manutenção Prev.". A URL da foto vem assinada pelo servidor.
  maquinaPatrimonio?: string
  maquinaFotoUrl?: string
  setorId: number
  setorNome: string
  lojaId: number
  lojaNome?: string
  // Denormalizado do servidor, no mesmo padrão de maquinaNome/setorNome/lojaNome. Opcional
  // porque preventiva cadastrada antes de o técnico virar obrigatório volta sem ele — é na
  // listagem que o Administrador vê quais ainda precisa corrigir.
  tecnicoNome?: string
  // Calculado no servidor: a preventiva venceu e já gerou solicitação automática.
  vencida?: boolean
}

// Um ciclo de GET /preventivas/:id/historico: a OS que o servidor abriu quando a
// preventiva venceu (`id` é o da OS). "Feito" é `status === 'Concluída'` — derivado na
// tela, não um booleano a mais que poderia discordar do status. `dataAbertura` é quando
// o ciclo venceu; `dataFim` só existe na OS encerrada.
export interface CicloPreventiva {
  id: number
  status: StatusExecucaoOS
  dataAbertura: string
  dataInicio?: string
  dataFim?: string
  tecnicoNome: string
}

// A loja não é enviada: ela é derivada do setor no servidor, evitando um par
// (loja, setor) que possa se contradizer.
export interface NovaMaquinaPayload {
  numeroPatrimonio: string
  serie: string
  nome: string
  descricao?: string
  marca?: string
  modelo?: string
  criticidade: NivelCriticidade
  setorId: number
  preventivas: PreventivaManutencao[]
}

export interface AtualizarMaquinaPayload extends NovaMaquinaPayload {
  id: number
}
