// Formato de data/hora acordado com o back-end: dd/mm/yyyy HH:MM:SS.
// Todo instante que entra ou sai da API passa por aqui — o resto do front trabalha com
// Date. Não use new Date(texto) direto num valor vindo da API: o parser nativo não
// entende dd/mm/yyyy e interpreta 08/09/2026 como 8 de setembro em alguns ambientes e
// 9 de agosto em outros.

const FORMATO_DATA_HORA = /^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2}):(\d{2})$/
const FORMATO_DATA = /^(\d{2})\/(\d{2})\/(\d{4})$/
const FORMATO_DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/

function doisDigitos(valor: number): string {
  return String(valor).padStart(2, '0')
}

// "08/08/2026 14:32:00" ou "08/08/2026" -> Date no fuso local.
export function converterDataBackend(texto: string): Date {
  const comHora = FORMATO_DATA_HORA.exec(texto)

  if (comHora) {
    const [, dia, mes, ano, hora, minuto, segundo] = comHora
    return new Date(
      Number(ano),
      Number(mes) - 1,
      Number(dia),
      Number(hora),
      Number(minuto),
      Number(segundo),
    )
  }

  const semHora = FORMATO_DATA.exec(texto)

  if (semHora) {
    const [, dia, mes, ano] = semHora
    return new Date(Number(ano), Number(mes) - 1, Number(dia))
  }

  return new Date(Number.NaN)
}

export function ehDataBackendValida(texto: string | undefined | null): boolean {
  if (!texto) {
    return false
  }

  return !Number.isNaN(converterDataBackend(texto).getTime())
}

// Date -> "08/08/2026 14:32:00"
export function formatarDataHoraBackend(data: Date): string {
  const dia = doisDigitos(data.getDate())
  const mes = doisDigitos(data.getMonth() + 1)
  const ano = data.getFullYear()
  const hora = doisDigitos(data.getHours())
  const minuto = doisDigitos(data.getMinutes())
  const segundo = doisDigitos(data.getSeconds())

  return `${dia}/${mes}/${ano} ${hora}:${minuto}:${segundo}`
}

// Date -> "08/08/2026"
export function formatarDataBackend(data: Date): string {
  return `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}/${data.getFullYear()}`
}

export function agoraParaBackend(): string {
  return formatarDataHoraBackend(new Date())
}

// <input type="date"> devolve YYYY-MM-DD; o back-end espera dd/mm/yyyy.
export function converterDataFormularioParaBackend(dataFormulario: string): string {
  const iso = FORMATO_DATA_ISO.exec(dataFormulario)

  if (!iso) {
    return dataFormulario
  }

  const [, ano, mes, dia] = iso

  return `${dia}/${mes}/${ano}`
}

// Caminho inverso, para preencher <input type="date"> ao editar um registro.
export function converterDataBackendParaFormulario(dataBackend: string): string {
  const comData = FORMATO_DATA.exec(dataBackend) ?? FORMATO_DATA_HORA.exec(dataBackend)

  if (!comData) {
    return ''
  }

  const [, dia, mes, ano] = comData

  return `${ano}-${mes}-${dia}`
}
