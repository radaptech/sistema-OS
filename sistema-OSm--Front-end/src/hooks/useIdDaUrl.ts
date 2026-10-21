import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

// Lê um id da query string (?os=12, ?solicitacao=34) -- é por onde a notificação diz
// "abra este item" ao painel de destino (url gravada pelo back em `notificacao.url`).
// Devolve também `consumir`, que tira o parâmetro da URL sem empilhar histórico: o
// modal abre uma vez só, e o F5 ou o voltar do navegador não reabrem o mesmo item.
//
// Valor que não é inteiro positivo vira null -- a url vem do banco, mas a barra de
// endereço é do usuário.
export function useIdDaUrl(nome: string): [number | null, () => void] {
  const [parametros, setParametros] = useSearchParams()
  const bruto = parametros.get(nome)
  const id = bruto && /^[1-9]\d*$/.test(bruto) ? Number(bruto) : null

  const consumir = useCallback(() => {
    setParametros(
      (atuais) => {
        const novos = new URLSearchParams(atuais)
        novos.delete(nome)
        return novos
      },
      { replace: true },
    )
  }, [nome, setParametros])

  return [id, consumir]
}
