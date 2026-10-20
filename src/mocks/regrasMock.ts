// Regras de negócio replicadas do back-end real (ver CLAUDE.md) para o modo mock: escopo
// de acesso, ciclo de vida da OS, preventivas vencidas e indicadores de máquina.
import { agoraParaBackend, converterDataBackend } from '../utilitarios/dataBackend'
import { tiposDefeito } from '../tipos/ordemServico'
import type {
  CustoOrdemServico,
  ItemCustoOS,
  ItemCustoPayload,
  NotaFiscalOS,
  NotaFiscalPayload,
  OrdemServico,
  PausaOrdemServico,
  TipoDefeito,
} from '../tipos/ordemServico'
import type { EscopoAcessoGestor, SessaoUsuario } from '../tipos/autenticacao'
import type {
  GrupoOrdensDoPainel,
  IndicadoresLoja,
  IndicadoresMaquina,
  IndicadorMensal,
  OrdemDoPainel,
  ResumoIndicadores,
} from '../tipos/indicadorMaquina'
import type { RespostaPaginada } from '../tipos/paginacao'
import {
  maquinas,
  ordensServico,
  preventivas,
  setores,
  solicitacoes,
  usuarios,
  type PreventivaInterna,
  type UsuarioInterno,
} from './bancoMock'
import { gerarId, paginarLista } from './utilidadesMock'
// Ciclo com notificacoesMock (que usa construirEscoposGestor daqui): inofensivo, ninguém
// chama nada no carregamento -- ver semearNotificacoes.
import { notificarOSPreventiva } from './notificacoesMock'

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100
}

// Mesmo conjunto de setores/acesso-total é aplicado a todas as lojas marcadas no
// cadastro (ver CLAUDE.md item 7) — exceto quando o seed define um escopo customizado
// para demonstrar um caso misto (parcial + total) sem precisar de uma edição posterior.
export function construirEscoposGestor(usuario: UsuarioInterno): EscopoAcessoGestor[] {
  if (usuario.escoposGestorSeed) {
    return usuario.escoposGestorSeed
  }

  return usuario.lojasIds.map((lojaId) => ({
    lojaId,
    setoresIds: usuario.acessoTotalSetores
      ? ('todos' as const)
      : setores
          .filter((setor) => setor.lojaId === lojaId && usuario.setoresIds.includes(setor.id))
          .map((setor) => setor.id),
  }))
}

export function gestorTemAcesso(
  escopos: EscopoAcessoGestor[],
  lojaId: number,
  setorId: number,
): boolean {
  return escopos.some(
    (escopo) =>
      escopo.lojaId === lojaId &&
      (escopo.setoresIds === 'todos' || escopo.setoresIds.includes(setorId)),
  )
}

// Espelha o EXISTS de escopo do servidor (ListarMaquinas/ListarPreventivas): admin vê o
// tenant, gestor pelos escopos, técnico pelas lojas (todos os setores) e solicitante só o
// próprio setor. Sem isso o modo mock mostraria máquinas que a API real esconde.
export function usuarioAlcanca(usuario: UsuarioInterno, lojaId: number, setorId: number): boolean {
  switch (usuario.perfil) {
    case 'administrador':
      return true
    case 'gestor':
      return gestorTemAcesso(construirEscoposGestor(usuario), lojaId, setorId)
    case 'tecnico':
      return usuario.lojasIds.includes(lojaId)
    default:
      return usuario.lojasIds.includes(lojaId) && usuario.setoresIds.includes(setorId)
  }
}

export function construirSessao(usuario: UsuarioInterno): SessaoUsuario {
  const ehSolicitante = usuario.perfil === 'solicitante'
  const setorPrincipal = ehSolicitante
    ? (setores.find((setor) => setor.id === usuario.setoresIds[0]) ?? null)
    : null

  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
    lojaId: ehSolicitante ? (usuario.lojasIds[0] ?? null) : null,
    setorId: ehSolicitante ? (usuario.setoresIds[0] ?? null) : null,
    setorNome: ehSolicitante ? (setorPrincipal?.nome ?? null) : null,
    escoposGestor: usuario.perfil === 'gestor' ? construirEscoposGestor(usuario) : null,
    tecnicoId: usuario.perfil === 'tecnico' ? usuario.id : null,
  }
}

export function preventivaEstaVencida(preventiva: PreventivaInterna): boolean {
  return preventiva.ativa && converterDataBackend(preventiva.proximaData).getTime() <= Date.now()
}

// Roda antes de qualquer listagem de solicitações/preventivas/OS. Espelha o job do
// back-end: para cada preventiva ativa e vencida, abre a SolicitacaoOS com origem
// 'preventiva' (sem solicitante — o job não tem "quem pediu") E a OrdemServico junto,
// já atribuída ao técnico da preventiva.
//
// ⚠️ A preventiva NÃO passa pela fila do Gestor. A solicitação nasce 'Convertida' e a
// OS nasce 'Aberta' com urgência Baixa: o trabalho já foi aprovado quando a máquina foi
// cadastrada. É por isso que a guarda de duplicata olha a OS existente, e não uma
// solicitação Pendente, que nunca chega a existir.
export function sincronizarPreventivasVencidas(): void {
  for (const preventiva of preventivas) {
    if (!preventivaEstaVencida(preventiva)) {
      continue
    }

    const jaGerada = solicitacoes.some(
      (solicitacao) =>
        solicitacao.origem === 'preventiva' && solicitacao.preventivaId === preventiva.id,
    )

    if (jaGerada) {
      continue
    }

    const maquina = maquinas.find((item) => item.id === preventiva.maquinaId)
    const tecnico = usuarios.find(
      (item) => item.id === preventiva.tecnicoId && item.perfil === 'tecnico' && item.ativo,
    )

    // Sem técnico válido o back-end reporta falha no cron; aqui não há para onde
    // reportar, então a preventiva simplesmente não abre nada.
    if (!maquina || !tecnico) {
      continue
    }

    const solicitacao = {
      id: gerarId(solicitacoes),
      tipo: 'maquinario' as const,
      maquinaId: maquina.id,
      maquinaNome: maquina.nome,
      maquinaCodigo: maquina.numeroPatrimonio ?? null,
      maquinaFotoUrl: maquina.fotoUrl,
      itemDescricao: null,
      status: 'Convertida' as const,
      descricao: `Manutenção preventiva vencida: ${preventiva.descricao}`,
      solicitanteId: null,
      solicitanteNome: null,
      criadoEm: agoraParaBackend(),
      setorId: maquina.setorId,
      setorNome: maquina.setorNome,
      lojaId: maquina.lojaId,
      lojaNome: maquina.lojaNome ?? '',
      impactos: [],
      origem: 'preventiva' as const,
      preventivaId: preventiva.id,
      anexos: [],
    }
    solicitacoes.push(solicitacao)

    const ordem: OrdemServico = {
      id: gerarId(ordensServico),
      solicitacaoId: solicitacao.id,
      origem: 'preventiva',
      tipo: 'maquinario',
      maquinaId: solicitacao.maquinaId,
      maquinaNome: solicitacao.maquinaNome,
      maquinaCodigo: solicitacao.maquinaCodigo,
      itemDescricao: null,
      descricao: solicitacao.descricao,
      setorId: solicitacao.setorId,
      setorNome: solicitacao.setorNome,
      lojaId: solicitacao.lojaId,
      lojaNome: solicitacao.lojaNome,
      solicitanteNome: null,
      // Trabalho planejado com data marcada: se fosse urgente não teria esperado o
      // calendário.
      urgencia: 'Baixa',
      tecnicoId: tecnico.id,
      tecnicoNome: tecnico.nome,
      tecnicoArea: tecnico.area,
      statusExecucao: 'Aberta',
      finalizada: false,
      // Sem Solicitante não há quem marque impacto, então o relógio de máquina parada
      // não roda e a tela escreve "Não se aplica".
      afetaProducao: false,
      dataSolicitacao: solicitacao.criadoEm,
      dataAbertura: agoraParaBackend(),
      pausas: [],
    }
    ordensServico.push(ordem)
    notificarOSPreventiva(ordem)
  }
}

function horasEntre(inicio: string, fim: string): number {
  return (converterDataBackend(fim).getTime() - converterDataBackend(inicio).getTime()) / 3_600_000
}

// Horas Trabalhadas: soma o período aberto entre início e fim, descontando só as pausas
// que ocorreram depois de dataInicio (statusAnterior === 'Em Andamento') — pausas
// ocorridas com a OS ainda 'Aberta' não descontam nada, porque o trabalho não tinha
// começado.
export function calcularHorasTrabalhadas(
  dataInicio: string,
  dataFim: string,
  pausas: PausaOrdemServico[],
): number {
  const totalHoras = horasEntre(dataInicio, dataFim)
  const horasPausadas = pausas
    .filter((pausa) => pausa.statusAnterior === 'Em Andamento' && pausa.retomadaEm)
    .reduce((soma, pausa) => soma + horasEntre(pausa.pausadaEm, pausa.retomadaEm as string), 0)

  return arredondar(Math.max(0, totalHoras - horasPausadas))
}

// Horas Parada: corre sem interrupção desde a solicitação (a máquina já parou ali, mesmo
// que o Gestor só abra a OS depois) até o fim — só existe quando a OS afeta produção
// (ver `afetaProducao` em OrdemServico).
export function calcularHorasParada(dataSolicitacao: string, dataFim: string): number {
  return arredondar(horasEntre(dataSolicitacao, dataFim))
}

export function calcularFinalizada(ordem: Pick<OrdemServico, 'statusExecucao' | 'custo'>): boolean {
  return ordem.statusExecucao === 'Concluída' && ordem.custo !== undefined
}

// Os dois agregados de os_custo são a SOMA dos itens, calculada por quem grava — o
// servidor nunca aceita um total do cliente, e o payload nem carrega um. Replicado aqui
// para o modo mock não inventar uma segunda regra de soma.
//
// custoHoraTecnico fica null quando não há item da categoria: é o que ck_custo_por_tipo
// exige fora de maquinário, e o que faz a tela escrever "—" em vez de "R$ 0,00".
export function somarItensDeCusto(
  itens: ItemCustoPayload[],
): Pick<CustoOrdemServico, 'custoManutencao' | 'custoHoraTecnico' | 'custoTotal'> {
  const custoManutencao = itens.reduce((soma, item) => soma + item.custoManutencao, 0)
  const totalHoraTecnica = itens.reduce((soma, item) => soma + (item.custoHoraTecnico ?? 0), 0)
  // Nenhuma tarefa com hora lançada é diferente de "não se aplica": em maquinário a coluna
  // existe e vale zero (conserto sem mão de obra cobrada), fora dele ela é proibida. Quem
  // sabe o tipo da OS é quem chama, então o sinal aqui é a AUSÊNCIA do campo em todas as
  // tarefas — o mesmo que o servidor faz com `Invalid`.
  const algumaTemHora = itens.some((item) => item.custoHoraTecnico !== undefined)
  const custoHoraTecnico = algumaTemHora ? totalHoraTecnica : null

  return {
    custoManutencao,
    custoHoraTecnico,
    custoTotal: custoManutencao + totalHoraTecnica,
  }
}

// O id de cada linha nasce no banco; aqui é um contador de módulo, que basta porque o
// "banco" mock reseta a cada reload da página. Só serve de `key` nas listas do React.
let proximoIdItemCusto = 1
let proximoIdNotaFiscal = 1

export function materializarItens(itens: ItemCustoPayload[]): ItemCustoOS[] {
  return itens.map((item) => ({
    id: proximoIdItemCusto++,
    descricao: item.descricao.trim(),
    custoManutencao: item.custoManutencao,
    custoHoraTecnico: item.custoHoraTecnico ?? null,
  }))
}

export function materializarNotas(notas: NotaFiscalPayload[]): NotaFiscalOS[] {
  return notas.map((nota) => ({
    id: proximoIdNotaFiscal++,
    numero: nota.numero.trim(),
    // Série vazia vira ausência, como faz o NULLIF de CriarNotaFiscal no back.
    serie: nota.serie?.trim() || undefined,
  }))
}

function ordenarChaveMes(mes: string): number {
  const [mm, aaaa] = mes.split('/')
  return Number(aaaa) * 100 + Number(mm)
}

// Mesma divisão do back (model/indicadorMaquina.go): um resumo do histórico inteiro e
// um por mês de encerramento, que o painel exibe ao clicar na barra do mês.
function resumirIndicadores(historicoBruto: OrdemServico[]): ResumoIndicadores {
  // O pequeno reparo (sem máquina) e a manutenção preventiva ficam à parte, como no servidor:
  // só o maquinário alimenta os cards de falha e o custo das máquinas; o reparo soma em
  // quantidadeReparos/custoReparos e a preventiva em quantidadePreventivas/custoPreventivas.
  const reparos = historicoBruto.filter((ordem) => ordem.maquinaId === null)
  const preventivas = historicoBruto.filter(
    (ordem) => ordem.maquinaId !== null && ordem.origem === 'preventiva',
  )
  const historico = historicoBruto.filter(
    (ordem) => ordem.maquinaId !== null && ordem.origem !== 'preventiva',
  )
  const somarCusto = (lista: OrdemServico[]) =>
    arredondar(lista.reduce((soma, ordem) => soma + (ordem.custo?.custoTotal ?? 0), 0))
  const custoReparos = somarCusto(reparos)

  const horasParadaTotal = arredondar(
    historico.reduce((soma, ordem) => soma + (ordem.horasParada ?? 0), 0),
  )

  // MTBF e MTTR medem FALHA e conserto: a preventiva (revisão programada) já saiu acima,
  // então o que sobrou são as falhas. Sem isso o MTBF encolheria a cada revisão.
  const falhas = historico

  const horasTrabalhadasValidas = falhas
    .map((ordem) => ordem.horasTrabalhadas)
    .filter((horas): horas is number => horas !== undefined)

  const mttrHoras = horasTrabalhadasValidas.length
    ? arredondar(
        horasTrabalhadasValidas.reduce((soma, horas) => soma + horas, 0) /
          horasTrabalhadasValidas.length,
      )
    : 0

  // MTBF de um grupo (setor, loja) só mede entre OS da MESMA máquina, como o servidor
  // (mtbf em model/indicadorMaquina.go): entre máquinas diferentes o intervalo encolheria
  // a cada máquina cadastrada no setor. Para uma máquina só, é a conta de sempre.
  const aberturasPorMaquina = new Map<number, number[]>()
  for (const ordem of falhas) {
    const chave = ordem.maquinaId ?? 0
    aberturasPorMaquina.set(chave, [
      ...(aberturasPorMaquina.get(chave) ?? []),
      converterDataBackend(ordem.dataAbertura).getTime(),
    ])
  }
  const intervalos = [...aberturasPorMaquina.values()].flatMap((aberturas) => {
    const ordenadas = [...aberturas].sort((a, b) => a - b)
    return ordenadas.slice(1).map((instante, indice) => (instante - ordenadas[indice]) / 3_600_000)
  })
  const mtbfHoras = intervalos.length
    ? arredondar(intervalos.reduce((soma, horas) => soma + horas, 0) / intervalos.length)
    : 0

  const custoTotal = somarCusto(historico)

  const horasPorTipo = new Map<TipoDefeito, number>()

  for (const ordem of historico) {
    if (!ordem.tipoDefeito) {
      continue
    }

    horasPorTipo.set(ordem.tipoDefeito, (horasPorTipo.get(ordem.tipoDefeito) ?? 0) + (ordem.horasParada ?? 0))
  }

  const porTipoDefeito = tiposDefeito.map((tipo) => ({
    tipoDefeito: tipo,
    horasParada: arredondar(horasPorTipo.get(tipo) ?? 0),
  }))

  return {
    quantidadeOs: historico.length,
    horasParadaTotal,
    mttrHoras,
    mtbfHoras,
    custoTotal,
    porTipoDefeito,
    quantidadeReparos: reparos.length,
    custoReparos,
    quantidadePreventivas: preventivas.length,
    custoPreventivas: somarCusto(preventivas),
  }
}

export function computarIndicadores(maquinaId: number): IndicadoresMaquina {
  const historico = ordensServico.filter(
    (ordem) => ordem.maquinaId === maquinaId && ordem.statusExecucao === 'Concluída',
  )

  return { maquinaId, ...resumirIndicadores(historico), porMes: resumirPorMes(historico) }
}

// GET /indicadores/lojas/:id: total, setores e máquinas da loja, recortados pelo escopo
// de quem chama (mesmo EXISTS de ListarMaquinas no servidor). Setor da OS é o ATUAL da
// máquina, e toda máquina/setor da lista ganha card, zerado quando não tem histórico.
export function computarIndicadoresLoja(lojaId: number, usuario: UsuarioInterno): IndicadoresLoja {
  const maquinasDaLoja = maquinas
    .filter(
      (maquina) =>
        maquina.ativa !== false &&
        maquina.lojaId === lojaId &&
        usuarioAlcanca(usuario, maquina.lojaId, maquina.setorId),
    )
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

  const historicoDa = (maquinaIds: number[]) =>
    ordensServico.filter(
      (ordem) =>
        ordem.statusExecucao === 'Concluída' &&
        ordem.maquinaId !== null &&
        maquinaIds.includes(ordem.maquinaId),
    )

  // Pequenos reparos encerrados da loja, no escopo de quem chama: sem máquina, só o setor.
  // Entram no total da loja e no setor (e nos meses deles), nunca na máquina.
  const reparosDaLoja = ordensServico.filter(
    (ordem) =>
      ordem.statusExecucao === 'Concluída' &&
      ordem.maquinaId === null &&
      ordem.lojaId === lojaId &&
      usuarioAlcanca(usuario, ordem.lojaId, ordem.setorId),
  )

  const historico = [
    ...historicoDa(maquinasDaLoja.map((maquina) => maquina.id)),
    ...reparosDaLoja,
  ]
  // Setor que só teve reparo (sem máquina) ganha card também, como no servidor.
  const setoresIds = [
    ...new Set([
      ...maquinasDaLoja.map((maquina) => maquina.setorId),
      ...reparosDaLoja.map((ordem) => ordem.setorId),
    ]),
  ]

  return {
    lojaId,
    ...resumirIndicadores(historico),
    porMes: resumirPorMes(historico),
    porSetor: setoresIds.map((setorId) => {
      const doSetor = maquinasDaLoja.filter((maquina) => maquina.setorId === setorId)
      const reparosDoSetor = reparosDaLoja.filter((ordem) => ordem.setorId === setorId)
      const historicoSetor = [
        ...historicoDa(doSetor.map((maquina) => maquina.id)),
        ...reparosDoSetor,
      ]
      return {
        setorId,
        setorNome: doSetor[0]?.setorNome ?? reparosDoSetor[0].setorNome,
        quantidadeMaquinas: doSetor.length,
        ...resumirIndicadores(historicoSetor),
        porMes: resumirPorMes(historicoSetor),
      }
    }),
    porMaquina: maquinasDaLoja.map((maquina) => {
      const historicoMaquina = historicoDa([maquina.id])
      return {
        maquinaId: maquina.id,
        setorId: maquina.setorId,
        ...resumirIndicadores(historicoMaquina),
        porMes: resumirPorMes(historicoMaquina),
      }
    }),
  }
}

// GET /indicadores/lojas/:id/ordens: a lista por trás de um card de custo do painel da loja — o
// "maquinario" (as OS de máquina, preventiva inclusa) ou os "reparos" (sem máquina, à parte).
// Mesma definição e mesmo escopo do painel (setor ATUAL da máquina, só máquina ativa), então a
// soma dos itens é o custo do card. `mes` é o rótulo "MM/YYYY" do gráfico (mês de encerramento).
export function listarOrdensDoPainelMock(
  lojaId: number,
  usuario: UsuarioInterno,
  grupo: GrupoOrdensDoPainel,
  setorId: number | null,
  maquinaId: number | null,
  mes: string | null,
  pagina: number,
): RespostaPaginada<OrdemDoPainel> {
  const rotuloDoMes = (dataFim: string | undefined) => {
    if (!dataFim) {
      return null
    }
    const data = converterDataBackend(dataFim)
    return `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`
  }

  const ordens: OrdemDoPainel[] = []

  for (const ordem of ordensServico) {
    if (ordem.statusExecucao !== 'Concluída' || (mes !== null && rotuloDoMes(ordem.dataFim) !== mes)) {
      continue
    }

    // O setor do reparo é o da solicitação; o da máquina é o ATUAL dela.
    const maquina = ordem.maquinaId === null ? undefined : maquinas.find((m) => m.id === ordem.maquinaId)
    const setorDaOrdem = maquina ? maquina.setorId : ordem.setorId
    const lojaDaOrdem = maquina ? maquina.lojaId : ordem.lojaId

    // Maquinário e preventivas são OS de máquina, separadas pela origem (como no servidor).
    const doGrupo =
      grupo === 'reparos'
        ? ordem.maquinaId === null
        : ordem.maquinaId !== null &&
          maquina !== undefined &&
          maquina.ativa !== false &&
          (ordem.origem === 'preventiva') === (grupo === 'preventivas')
    if (
      !doGrupo ||
      lojaDaOrdem !== lojaId ||
      !usuarioAlcanca(usuario, lojaDaOrdem, setorDaOrdem) ||
      (setorId !== null && setorDaOrdem !== setorId) ||
      (maquinaId !== null && ordem.maquinaId !== maquinaId)
    ) {
      continue
    }

    ordens.push({
      id: ordem.id,
      item: grupo === 'reparos' ? (ordem.itemDescricao ?? '') : (ordem.maquinaNome ?? ''),
      codigo: grupo === 'reparos' ? null : ordem.maquinaCodigo,
      maquinaId: grupo === 'reparos' ? null : ordem.maquinaId,
      origem: ordem.origem,
      descricao: ordem.descricao,
      setorId: setorDaOrdem,
      setorNome: maquina ? maquina.setorNome : ordem.setorNome,
      tecnicoNome: ordem.tecnicoNome ?? '—',
      encerradaEm: ordem.dataFim ?? null,
      custoTotal: ordem.custo?.custoTotal ?? 0,
    })
  }

  ordens.sort(
    (a, b) =>
      converterDataBackend(b.encerradaEm ?? '01/01/1970').getTime() -
      converterDataBackend(a.encerradaEm ?? '01/01/1970').getTime(),
  )

  return paginarLista(ordens, pagina, 12)
}

function resumirPorMes(historico: OrdemServico[]): IndicadorMensal[] {
  const ordensPorMes = new Map<string, OrdemServico[]>()

  for (const ordem of historico) {
    if (!ordem.dataFim) {
      continue
    }

    const data = converterDataBackend(ordem.dataFim)
    const chave = `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`
    ordensPorMes.set(chave, [...(ordensPorMes.get(chave) ?? []), ordem])
  }

  return Array.from(ordensPorMes.entries())
    .map(([mes, ordensDoMes]) => ({ mes, ...resumirIndicadores(ordensDoMes) }))
    .sort((a, b) => ordenarChaveMes(a.mes) - ordenarChaveMes(b.mes))
    .slice(-12)
}
