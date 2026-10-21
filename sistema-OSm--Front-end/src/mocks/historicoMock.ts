// Histórico de 12 meses de OS concluídas para as máquinas da Loja 1, relativo à data de
// hoje — sem ele o seed só cobre junho/julho e o gráfico "Custo Mensal (últimos 12
// meses)" do DashboardGestor mostraria duas barras. Importado por efeito em apiMock.ts.
import { formatarDataHoraBackend } from '../utilitarios/dataBackend'
import { maquinas, ordensServico, solicitacoes } from './bancoMock'
import { gerarId } from './utilidadesMock'

const MAQUINAS_COM_HISTORICO = [1, 2, 3, 4]

function emData(mesesAtras: number, dia: number, hora: number): string {
  const data = new Date()
  data.setDate(1)
  data.setMonth(data.getMonth() - mesesAtras)
  data.setDate(dia)
  data.setHours(hora, 0, 0, 0)
  return formatarDataHoraBackend(data)
}

for (const maquinaId of MAQUINAS_COM_HISTORICO) {
  const maquina = maquinas.find((item) => item.id === maquinaId)

  if (!maquina) {
    continue
  }

  for (let mesesAtras = 1; mesesAtras <= 12; mesesAtras++) {
    const dia = 3 + ((maquinaId * 5 + mesesAtras) % 20)
    const corretiva = (maquinaId + mesesAtras) % 3 !== 0
    // Independente do tipo, para a rosca "Paradas por Tipo de OS" ter as duas fatias.
    const afetaProducao = (maquinaId + mesesAtras) % 4 !== 0
    // Valores variados mas determinísticos, para o gráfico não sair uma régua.
    const custoManutencao = 60 + ((maquinaId * 37 + mesesAtras * 53) % 240)
    const custoHoraTecnico = 30 + ((maquinaId * 11 + mesesAtras * 7) % 40)
    const horasTrabalhadas = 1 + (mesesAtras % 4)
    const solicitacaoId = gerarId(solicitacoes)
    const descricao = corretiva
      ? `Falha em ${maquina.nome.toLowerCase()}, equipamento parou durante o expediente.`
      : `Ajuste na instalação de ${maquina.nome.toLowerCase()}.`

    solicitacoes.push({
      id: solicitacaoId,
      tipo: 'maquinario',
      maquinaId,
      maquinaNome: maquina.nome,
      maquinaCodigo: maquina.numeroPatrimonio ?? null,
      maquinaFotoUrl: maquina.fotoUrl,
      itemDescricao: null,
      status: 'Convertida',
      descricao,
      solicitanteId: 1,
      solicitanteNome: 'Marina Souza',
      criadoEm: emData(mesesAtras, dia, 7),
      setorId: maquina.setorId,
      setorNome: maquina.setorNome,
      lojaId: maquina.lojaId,
      lojaNome: maquina.lojaNome ?? '',
      impactos: afetaProducao ? ['Afeta Produção'] : [],
      origem: 'solicitante',
      anexos: [],
    })

    ordensServico.push({
      id: gerarId(ordensServico),
      solicitacaoId,
      origem: 'solicitante',
      tipo: 'maquinario',
      maquinaId,
      maquinaNome: maquina.nome,
      maquinaCodigo: maquina.numeroPatrimonio ?? null,
      itemDescricao: null,
      descricao,
      tipoDefeito: corretiva ? 'Corretiva' : 'Predial',
      setorId: maquina.setorId,
      setorNome: maquina.setorNome,
      lojaId: maquina.lojaId,
      lojaNome: maquina.lojaNome ?? '',
      solicitanteNome: 'Marina Souza',
      urgencia: corretiva ? 'Alta' : 'Baixa',
      tecnicoId: 3,
      tecnicoNome: 'Roberto Alves',
      tecnicoArea: 'Refrigeração',
      statusExecucao: 'Concluída',
      finalizada: true,
      afetaProducao,
      dataSolicitacao: emData(mesesAtras, dia, 7),
      dataAbertura: emData(mesesAtras, dia, 8),
      dataInicio: emData(mesesAtras, dia, 9),
      dataFim: emData(mesesAtras, dia, 9 + horasTrabalhadas),
      horasTrabalhadas,
      horasParada: afetaProducao ? 2 + horasTrabalhadas : undefined,
      pausas: [],
      encerramento: {
        defeitoConstatado: corretiva
          ? 'Componente com desgaste além do limite.'
          : 'Instalação fora do padrão.',
        causaRaiz: 'Desgaste natural por uso contínuo.',
        solucao: 'Substituição do componente e teste de funcionamento.',
        encerradoPorNome: 'Roberto Alves',
      },
      custo: {
        temNotaFiscal: false,
        custoHoraTecnico,
        custoManutencao,
        custoTotal: custoHoraTecnico + custoManutencao,
        lancadoPorNome: 'Roberto Alves',
        lancadoEm: emData(mesesAtras, dia, 10 + horasTrabalhadas),
        revisadoEm: emData(mesesAtras, dia, 18),
        itens: [
          {
            id: 9000 + solicitacaoId,
            descricao: 'Serviço executado',
            custoManutencao,
            custoHoraTecnico,
          },
        ],
        notasFiscais: [],
      },
    })
  }
}
