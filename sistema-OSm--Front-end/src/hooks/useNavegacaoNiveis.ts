import { useSearchParams } from 'react-router-dom'
import { PARAMETROS_NAVEGACAO, type NivelNavegacao } from '../utilitarios/navegacaoNiveis'

export function useNavegacaoNiveis() {
  const [parametros, setParametros] = useSearchParams()

  // Entrar num nível descarta os de baixo: abrir outra loja não pode herdar o setor da
  // anterior (pegadinha do "pai zera o filho", CLAUDE.md da raiz). A aba fica.
  function navegar(nivel: NivelNavegacao) {
    setParametros((atuais) => {
      const proximos = new URLSearchParams(atuais)
      for (const chave of PARAMETROS_NAVEGACAO) {
        const valor = nivel[chave]
        if (valor === undefined) {
          proximos.delete(chave)
        } else {
          proximos.set(chave, String(valor))
        }
      }
      return proximos
    })
  }

  return { parametros, navegar }
}
