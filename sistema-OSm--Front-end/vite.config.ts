import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Carimba public/sw.js com um id por build (troca o '__VERSAO__'). É o que faz o
// navegador enxergar um service worker NOVO a cada deploy e o app oferecer "nova
// versão disponível" (utilitarios/registrarServiceWorker.ts) -- sem isso o sw.js seria
// sempre o mesmo arquivo e quem deixa o app instalado aberto nunca saberia que mudou.
// Só no build: em dev o placeholder fica cru, e tudo bem.
function versaoServiceWorker(): Plugin {
  let pastaSaida = 'dist'
  return {
    name: 'versao-service-worker',
    apply: 'build',
    configResolved(config) {
      pastaSaida = config.build.outDir
    },
    async closeBundle() {
      const arquivo = join(pastaSaida, 'sw.js')
      const conteudo = await readFile(arquivo, 'utf8')
      await writeFile(
        arquivo,
        conteudo.replace('__VERSAO__', Date.now().toString(36)),
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss(), versaoServiceWorker()],
    define: {
      'process.env.REACT_APP_URL_API': JSON.stringify(
        env.REACT_APP_URL_API ?? '',
      ),
    },
  }
})
