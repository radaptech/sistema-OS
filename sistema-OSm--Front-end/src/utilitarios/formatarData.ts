import { converterDataBackend, ehDataBackendValida } from './dataBackend'

// As datas chegam do back-end como dd/mm/yyyy ou dd/mm/yyyy HH:MM:SS. Como já vêm no
// formato brasileiro, exibir é quase repassar — o parse existe para validar e para
// permitir formatar só a parte que interessa.

export function formatarData(dataBackend: string): string {
  if (!ehDataBackendValida(dataBackend)) {
    return '—'
  }

  return converterDataBackend(dataBackend).toLocaleDateString('pt-BR')
}

export function formatarDataHora(dataBackend: string): string {
  if (!ehDataBackendValida(dataBackend)) {
    return '—'
  }

  const data = converterDataBackend(dataBackend)

  const dataFormatada = data.toLocaleDateString('pt-BR')
  const horaFormatada = data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return `${dataFormatada} ${horaFormatada}`
}
