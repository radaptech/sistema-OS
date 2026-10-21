import { converterDataBackendParaFormulario } from './dataBackend'

// A data vem do back-end como dd/mm/yyyy HH:MM:SS; inicio/fim vêm de <input type="date">,
// já em YYYY-MM-DD. Convertendo a primeira para YYYY-MM-DD, a comparação lexicográfica de
// strings equivale à cronológica — sem construir Date e sem depender de fuso horário.
export function dataEstaNoIntervalo(
  dataBackend: string,
  inicio: string,
  fim: string,
): boolean {
  if (!inicio && !fim) {
    return true
  }

  const data = converterDataBackendParaFormulario(dataBackend)

  if (!data) {
    return false
  }

  if (inicio && data < inicio) {
    return false
  }

  if (fim && data > fim) {
    return false
  }

  return true
}
