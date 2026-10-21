import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { PortaoSessao } from './componentes/PortaoSessao'
import { RotasPrincipais } from './rotas/RotasPrincipais'

const clienteQuery = new QueryClient({
  defaultOptions: {
    queries: {
      // O api.ts já trata 401 globalmente (toast + redireciono ao login); repetir a
      // requisição só atrasaria esse caminho.
      retry: 1,
      refetchOnWindowFocus: false,
      // Sem isto (padrão 0) toda tela que monta busca tudo de novo: ir aos Indicadores e
      // voltar ao painel refazia as quatro listas. 30s cobre esse vai-e-volta sem deixar
      // o dado de outro usuário velho por muito tempo. O que o PRÓPRIO usuário altera
      // não depende disso: toda mutação invalida as chaves que mexe e a lista recarrega
      // na hora -- mutação nova TEM que invalidar, senão o item salvo some por até 30s.
      staleTime: 30_000,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={clienteQuery}>
      <BrowserRouter>
        <PortaoSessao>
          <RotasPrincipais />
        </PortaoSessao>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
