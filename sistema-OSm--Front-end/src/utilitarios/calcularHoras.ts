import { converterDataBackend } from './dataBackend'

// Diferença em horas entre dois instantes no formato do back-end (dd/mm/yyyy HH:MM:SS),
// arredondada a 2 casas decimais. Usada apenas para exibir tempo decorrido ao vivo em OS
// ainda aberta — as horas de OS encerrada vêm calculadas do servidor.
export function calcularHoras(inicio: string, fim: string): number {
  const diferencaMs =
    converterDataBackend(fim).getTime() - converterDataBackend(inicio).getTime()

  if (Number.isNaN(diferencaMs)) {
    return 0
  }

  return Math.round((diferencaMs / 3600000) * 100) / 100
}
