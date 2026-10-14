import { converterDataBackend } from './dataBackend'
import { formatarData } from './formatarData'

// "agora", "há 5 min", "há 3 h", "ontem", "há 4 dias" -- e a data cheia depois de uma
// semana, quando "há 23 dias" já não ajuda ninguém a se localizar. Recebe o texto da API
// (dd/mm/yyyy HH:MM:SS), nunca um Date montado com new Date(texto).
export function tempoRelativo(dataBackend: string, agora = new Date()): string {
  const data = converterDataBackend(dataBackend)
  const minutos = Math.floor((agora.getTime() - data.getTime()) / 60_000)

  if (Number.isNaN(minutos)) {
    return ''
  }
  if (minutos < 1) {
    return 'agora'
  }
  if (minutos < 60) {
    return `há ${minutos} min`
  }

  const horas = Math.floor(minutos / 60)
  if (horas < 24) {
    return `há ${horas} h`
  }

  const dias = Math.floor(horas / 24)
  if (dias === 1) {
    return 'ontem'
  }
  if (dias < 7) {
    return `há ${dias} dias`
  }

  return formatarData(dataBackend)
}
