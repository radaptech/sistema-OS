// Horas trabalhadas/parada chegam como decimal de hora (3.5 = 3h30). Exibir o número cru
// ("3.75h", "0.0037661855555555556h") confunde — ninguém lê fração de hora. Converte para
// "Xh Ymin", omitindo a parte que for zero.
//   3.5   -> "3h 30min"      0.75  -> "45min"
//   300   -> "300h"          0     -> "0min"
export function formatarHoras(horasDecimais: number): string {
  const totalMinutos = Math.round(horasDecimais * 60)
  const horas = Math.floor(totalMinutos / 60)
  const minutos = totalMinutos % 60

  if (horas === 0) return `${minutos}min`
  if (minutos === 0) return `${horas}h`
  return `${horas}h ${minutos}min`
}
