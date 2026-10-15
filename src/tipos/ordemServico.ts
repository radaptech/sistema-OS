export const tiposOS = ['maquinario', 'terceiros', 'reparo'] as const

export type TipoOS = (typeof tiposOS)[number]

// O Solicitante abre apenas estes dois. `terceiros` NÃO é um tipo de pedido: é o desfecho
// de uma OS que o Técnico decidiu encaminhar para uma empresa externa (ver
// AcionamentoTerceiroPayload) — quem sabe se o caso é interno ou terceirizado é quem olha
// a máquina, não quem relata o problema.
export const tiposSolicitacao = ['maquinario', 'reparo'] as const

export type TipoSolicitacao = (typeof tiposSolicitacao)[number]

// Classificação exibida como "Tipo de OS": Predial (prédio/instalação) ou Corretiva
// (conserto do que quebrou).
// REGRA DE NEGÓCIO — quem classifica é quem executa: o Solicitante NÃO escolhe isso ao
// abrir o pedido (na prática ele não sabe distinguir os dois). A classificação entra no
// fim do fluxo, por quem viu o serviço: o Técnico ao encerrar a OS
// (EncerramentoOrdemServicoPayload) — inclusive quando o serviço foi executado por uma
// empresa externa, já que a OS continua sendo encerrada por ele.
// O campo trafega como `tipoDefeito` no contrato: renomeá-lo exigiria mudança simultânea
// no back-end, sem ganho funcional.
export const tiposDefeito = ['Predial', 'Corretiva'] as const

export type TipoDefeito = (typeof tiposDefeito)[number]

// Marcador único e opcional. Marcá-lo é o que liga o relógio de máquina parada da OS
// (ver `afetaProducao` em OrdemServico): sem ele, a máquina continua operando e a OS não
// acumula tempo de parada.
export const marcadoresImpacto = ['Afeta Produção'] as const

export type MarcadorImpacto = (typeof marcadoresImpacto)[number]

// Enviado como parte "dados" do multipart — a foto do defeito é obrigatória e vai como
// arquivo. Setor, loja, solicitante e data/hora NÃO são enviados: o servidor deriva da
// máquina e da sessão autenticada.
export interface NovaSolicitacaoOSPayload {
  maquinaId: number
  descricao: string
  impactos: MarcadorImpacto[]
}

export const statusSolicitacao = [
  'Pendente',
  'Convertida',
  'Rejeitada',
] as const

export type StatusSolicitacao = (typeof statusSolicitacao)[number]

// 'direta': Gestor/Administrador abriu a OS sem passar pela fila (sem foto, já nasce
// Convertida) — solicitanteId/solicitanteNome são de quem abriu.
export const origensSolicitacao = [
  'solicitante',
  'preventiva',
  'direta',
] as const

export type OrigemSolicitacao = (typeof origensSolicitacao)[number]

export interface AnexoSolicitacao {
  id: number
  tipo: 'foto' | 'video'
  url: string
}

export interface SolicitacaoOS {
  id: number
  tipo: TipoSolicitacao
  // Reparo não tem máquina cadastrada: maquinaId vem nulo e itemDescricao traz o texto
  // livre digitado pelo Solicitante.
  maquinaId: number | null
  maquinaNome: string | null
  maquinaCodigo: string | null
  // Foto de cadastro da máquina, resolvida pelo servidor — evita uma segunda consulta só
  // para mostrar a máquina no modal de detalhes.
  maquinaFotoUrl?: string
  itemDescricao: string | null
  status: StatusSolicitacao
  descricao: string
  // Nulo quando origem === 'preventiva': a solicitação foi aberta pelo job, sem pessoa.
  solicitanteId: number | null
  solicitanteNome: string | null
  criadoEm: string
  setorId: number
  setorNome: string
  lojaId: number
  lojaNome: string
  impactos: MarcadorImpacto[]
  origem: OrigemSolicitacao
  preventivaId?: number
  anexos: AnexoSolicitacao[]
  // Preenchidos pelo servidor quando status === 'Rejeitada'. O motivo é obrigatório na
  // rejeição justamente para o Solicitante saber o que corrigir antes de pedir de novo.
  motivoRejeicao?: string
  rejeitadoPorNome?: string
}

export const niveisUrgencia = ['Baixa', 'Média', 'Alta'] as const

export type IdUrgencia = (typeof niveisUrgencia)[number]

export interface AberturaOrdemServicoPayload {
  solicitacaoId: number
  urgencia: IdUrgencia
  tecnicoId: number
}

// POST /solicitacoes/direta — solicitação e OS de uma vez, sem foto. Maquinário manda
// maquinaId (o setor sai da máquina); reparo manda item + setorId. O técnico tem que
// atender a loja da solicitação — o servidor recusa com 400 se não atender.
export interface NovaSolicitacaoDiretaPayload {
  tipo: TipoSolicitacao
  maquinaId?: number
  item?: string
  setorId?: number
  descricao: string
  impactos: MarcadorImpacto[]
  urgencia: IdUrgencia
  tecnicoId: number
}

// Rejeição de uma solicitação Pendente pelo Gestor — o motivo volta para o Solicitante em
// Minhas Solicitações. Encerra a solicitação sem criar OrdemServico.
export interface RejeicaoSolicitacaoPayload {
  solicitacaoId: number
  motivo: string
}

// REGRA DE NEGÓCIO — terceirizar é decisão do Técnico, no meio da execução: ele recebe
// TODA OS, olha o problema e decide se resolve ou aciona uma empresa externa. Acionar não
// encerra nada: a OS continua com ele (mesma urgência, mesmos relógios) e só muda de
// `tipo` para 'terceiros', ganhando a empresa responsável. Quem encerra continua sendo o
// Técnico, quando a empresa termina o serviço.
export interface AcionamentoTerceiroPayload {
  ordemServicoId: number
  empresaTerceirizadaId: number
}

export const statusExecucaoOS = [
  'Aberta',
  'Em Andamento',
  'Pausada',
  'Concluída',
] as const

export type StatusExecucaoOS = (typeof statusExecucaoOS)[number]

// Status para o qual a OS deve voltar ao ser retomada de uma pausa.
export type StatusRetomavel = Extract<
  StatusExecucaoOS,
  'Aberta' | 'Em Andamento'
>

export interface PausaOrdemServico {
  id: number
  motivo: string
  pausadaEm: string
  retomadaEm: string | null
  statusAnterior: StatusRetomavel
}

// Uma TAREFA da OS: o que foi feito, com o material que consumiu e a mão de obra que
// cobrou. As duas grandezas na mesma linha, e não uma linha por valor com uma categoria:
// duas peças trocadas são duas tarefas, não duas mãos de obra.
//
// `custoHoraTecnico` é null em duas situações, e as duas são legítimas: fora de
// 'maquinario' a coluna é proibida, e dentro dele a tarefa pode não ter cobrado hora.
export interface ItemCustoOS {
  id: number
  descricao: string
  custoManutencao: number
  custoHoraTecnico: number | null
}

// Um documento registrado pelo Administrador na conferência. Sem campo de valor de
// propósito: o valor já está nos itens, e duas fontes para a mesma grandeza só criam a
// pergunta de qual está certa no dia em que discordarem.
export interface NotaFiscalOS {
  id: number
  numero: string
  // Nota de consumidor costuma não ter série.
  serie?: string
}

export interface CustoOrdemServico {
  // Somas dos itens de cada categoria, calculadas NO SERVIDOR. O front nunca as envia e
  // nunca as recalcula: elas são o que `os_custo` guarda, e divergir delas aqui esconderia
  // uma divergência real do banco em vez de deixá-la aparecer.
  custoHoraTecnico: number | null
  custoManutencao: number
  custoTotal: number
  // A discriminação por trás dos totais acima, uma linha por tarefa: "trocar o rolamento,
  // 180 de peça e 50 de mão de obra" em vez de um "420" que ninguém consegue conferir
  // contra nota nenhuma. Sempre presente (o servidor devolve lista vazia, nunca null),
  // podendo vir vazia em OS anterior à migration 000012.
  itens: ItemCustoOS[]
  // Declaração do Técnico no encerramento: houve compra com nota ou foi só mão de obra?
  // É ela que faz a lista abaixo aparecer na tela do Administrador — sem ela,
  // "OS que não gera nota" e "nota ainda não preenchida" seriam a mesma coisa.
  temNotaFiscal: boolean
  // Registradas pelo Administrador para auditoria do valor lançado contra os documentos
  // que o embasam. Valem em qualquer tipo de OS (fatura da empresa em terceiros, nota da
  // peça em maquinário, do material em reparo). São VÁRIAS porque duas peças compradas em
  // lojas diferentes geram dois documentos. Lista vazia com `temNotaFiscal` true é estado
  // legítimo e frequente: é a própria fila de conferência.
  notasFiscais: NotaFiscalOS[]
  // Esta, sim, só em terceiros: conta o que a EMPRESA EXTERNA fez. Nos outros tipos quem
  // fez foi o Técnico, e isso mora em `encerramento.solucao`.
  descricaoServicoTerceiro?: string
  lancadoPorNome: string
  lancadoEm: string
  // null até algum Administrador conferir o custo em Custos Pendentes; vira data
  // no primeiro POST /ordens-servico/:id/custo. É o que separa a pílula
  // "Pendentes" da "Revisadas" — e agora vale para todos, não só neste navegador.
  revisadoEm: string | null
}

export interface EncerramentoOrdemServico {
  defeitoConstatado: string
  causaRaiz: string
  solucao: string
  encerradoPorNome: string
}

export interface OrdemServico {
  id: number
  solicitacaoId: number
  tipo: TipoOS
  maquinaId: number | null
  maquinaNome: string | null
  maquinaCodigo: string | null
  itemDescricao: string | null
  descricao: string
  // Classificado no fim do fluxo (ver `tiposDefeito`): indefinido enquanto a OS não for
  // encerrada pelo Técnico.
  tipoDefeito?: TipoDefeito
  setorId: number
  setorNome: string
  lojaId: number
  lojaNome: string
  solicitanteNome: string | null
  // Técnico + Urgência são definidos pelo Gestor ao abrir a OS, para todo tipo — toda OS
  // passa pelo Técnico. A empresa terceirizada só existe quando ele acionou uma.
  urgencia?: IdUrgencia
  tecnicoId?: number
  tecnicoNome?: string
  tecnicoArea?: string
  empresaTerceirizadaId?: number
  empresaTerceirizadaNome?: string
  // Foto de cadastro da terceirizada, denormalizada como o nome (URL assinada).
  empresaTerceirizadaFotoUrl?: string
  statusExecucao: StatusExecucaoOS
  // Uma OS só é "finalizada" quando o Técnico encerrou E o custo foi lançado. O servidor
  // resolve essa regra e devolve pronta, em vez de cada tela recalcular.
  finalizada: boolean
  // REGRA DE NEGÓCIO — só conta parada quem parou: o servidor deriva esta flag do marcador
  // "Afeta Produção" que o Solicitante (opcionalmente) marcou. Com ela falsa, a máquina
  // seguiu operando e a OS não acumula tempo de parada: `horasParada` vem indefinida e as
  // telas exibem "Não se aplica" em vez de um número.
  afetaProducao: boolean
  // Instante em que o Solicitante enviou o pedido (`criadoEm` da solicitação de origem),
  // denormalizado pelo servidor no mesmo padrão de `maquinaNome`/`lojaNome`. É daqui que
  // parte o relógio de máquina parada: ela já estava parada enquanto a solicitação
  // esperava na fila do Gestor, então contar só a partir de `dataAbertura` esconderia
  // justamente o tempo de espera que o indicador precisa expor.
  dataSolicitacao: string
  dataAbertura: string
  dataInicio?: string
  dataFim?: string
  // Horas já calculadas pelo servidor: as trabalhadas a partir de dataInicio/dataFim menos
  // as pausas, as de parada a partir de dataSolicitacao/dataFim corridas. Só existem em OS
  // encerrada — e `horasParada` só existe quando `afetaProducao` é verdadeira.
  horasTrabalhadas?: number
  horasParada?: number
  // Pausa em aberto no momento — presente somente enquanto statusExecucao === 'Pausada'.
  pausaAtual?: PausaOrdemServico
  pausas?: PausaOrdemServico[]
  encerramento?: EncerramentoOrdemServico
  custo?: CustoOrdemServico
}

export interface EncerramentoOrdemServicoPayload {
  ordemServicoId: number
  // Quem executou o serviço é quem sabe classificá-lo (ver `tiposDefeito`).
  tipoDefeito: TipoDefeito
  defeitoConstatado: string
  causaRaiz: string
  solucao: string
  // A lista inteira de tarefas, com pelo menos uma. O servidor soma e grava os totais;
  // nenhum total viaja daqui. `custoHoraTecnico` só é aceito em tipo === 'maquinario': em
  // 'terceiros' quem trabalhou foi a empresa externa e em 'reparo' o serviço não cobra
  // hora técnica.
  itens: ItemCustoPayload[]
  // Declaração do Técnico: houve compra com nota (peça, material, fatura da empresa) ou
  // foi só mão de obra? Decide se o Administrador verá a lista de notas depois.
  // O número em si não vem daqui — quem preenche é ele, em Custos Pendentes.
  temNotaFiscal: boolean
}

export interface ItemCustoPayload {
  descricao: string
  custoManutencao: number
  // Omitido quando a tarefa não cobrou mão de obra, e sempre omitido fora de maquinário.
  custoHoraTecnico?: number
}

export interface NotaFiscalPayload {
  numero: string
  // String vazia quando o Administrador não preenche; o servidor converte em ausência.
  serie?: string
}

export interface LancamentoCustoManutencaoPayload {
  ordemServicoId: number
  // A lista inteira de tarefas, corrigida. É SUBSTITUIÇÃO, não patch: o modal abre
  // pré-preenchido com o que o Técnico lançou, então o que volta é o conjunto completo.
  itens: ItemCustoPayload[]
  // Repetido aqui porque o Administrador pode corrigir a declaração do Técnico: sem isso,
  // um Técnico que esqueceu de marcar deixaria a OS sem onde lançar a nota que ele tem
  // na mão. Desmarcar apaga as notas no servidor.
  temNotaFiscal: boolean
  notasFiscais: NotaFiscalPayload[]
  descricaoServicoTerceiro?: string
}

// Contadores da Home do Solicitante.
export interface ResumoSolicitacoes {
  abertas: number
  emAndamento: number
  concluidas: number
}
