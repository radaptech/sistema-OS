import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './index.css'
import App from './App.tsx'
import { AvisoNovaVersao } from './componentes/AvisoNovaVersao'
import { registrarServiceWorker } from './utilitarios/registrarServiceWorker'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <ToastContainer position="top-right" autoClose={4000} />
  </StrictMode>,
)

// PWA: instalável e com aviso de versão nova. O toast tem id fixo pra não empilhar se
// a checagem achar a mesma versão duas vezes.
registrarServiceWorker((aplicar) => {
  toast.info(<AvisoNovaVersao aoAtualizar={aplicar} />, {
    toastId: 'nova-versao',
    autoClose: false,
    closeOnClick: false,
    icon: false,
  })
})
