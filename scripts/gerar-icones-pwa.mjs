// Gera os ícones do PWA (public/icones/) a partir da marca que o app já usa no
// cabeçalho: a chave inglesa do lucide (`Wrench`, licença ISC) em branco sobre o verde
// `marca-600`. Rode com `npm run icones:pwa` depois de mexer na cor ou no desenho -- os
// PNGs são versionados, então o build não depende de navegador headless.
//
// Usa o Chrome do puppeteer (dependência do @mermaid-js/mermaid-cli, já usado em
// `docs:der`) só para rasterizar o SVG no tamanho exato de cada ícone.
import { mkdir, writeFile } from 'node:fs/promises'
import puppeteer from 'puppeteer'

const VERDE = '#2f6e42' // marca-600 (tailwind.config.ts)
const CHAVE =
  'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z'

// fracaoDesenho: quanto da largura a chave ocupa. `maskable` precisa caber no círculo
// de segurança de 80% (o Android recorta em círculo, gota, quadrado...), então o
// desenho fica menor e o verde vai até a borda. `any` é o ícone "como está": quadrado
// arredondado com margem transparente, que é como o Chrome desktop e a lista de apps
// mostram.
//
// semFundo: só a chave, sem o quadrado verde -- é o `badge` da notificação push, o
// ícone pequeno da barra de status do Android. Ele usa só a transparência do PNG (pinta
// tudo de uma cor), então o ícone normal viraria um quadrado branco.
function svg({
  tamanho,
  fracaoDesenho,
  raio,
  margem = 0,
  semFundo = false,
  traco = 2,
}) {
  const lado = tamanho - margem * 2
  const escala = (tamanho * fracaoDesenho) / 24
  const deslocamento = (tamanho - 24 * escala) / 2
  const fundo = semFundo
    ? ''
    : `<rect x="${margem}" y="${margem}" width="${lado}" height="${lado}" rx="${raio}" fill="${VERDE}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}" viewBox="0 0 ${tamanho} ${tamanho}">
  ${fundo}
  <g transform="translate(${deslocamento} ${deslocamento}) scale(${escala})">
    <path d="${CHAVE}" fill="none" stroke="#ffffff" stroke-width="${traco}" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`
}

const ICONES = [
  // purpose "any": quadrado arredondado com respiro, fundo transparente.
  {
    arquivo: 'icone-192.png',
    tamanho: 192,
    fracaoDesenho: 0.5,
    raio: 40,
    margem: 8,
  },
  {
    arquivo: 'icone-512.png',
    tamanho: 512,
    fracaoDesenho: 0.5,
    raio: 108,
    margem: 20,
  },
  // purpose "maskable": verde até a borda, desenho dentro da zona segura.
  {
    arquivo: 'icone-maskable-512.png',
    tamanho: 512,
    fracaoDesenho: 0.42,
    raio: 0,
  },
  // iOS recorta os cantos sozinho e não aceita transparência (vira preto).
  {
    arquivo: 'apple-touch-icon.png',
    tamanho: 180,
    fracaoDesenho: 0.5,
    raio: 0,
  },
  // Barra de status do Android (notificação push): monocromático, traço mais grosso
  // pra continuar legível em 24dp.
  {
    arquivo: 'badge-96.png',
    tamanho: 96,
    fracaoDesenho: 0.8,
    raio: 0,
    semFundo: true,
    traco: 2.5,
  },
]

await mkdir('public/icones', { recursive: true })

const navegador = await puppeteer.launch()
try {
  const pagina = await navegador.newPage()
  for (const icone of ICONES) {
    const conteudo = svg(icone)
    await pagina.setViewport({ width: icone.tamanho, height: icone.tamanho })
    await pagina.setContent(
      `<html><body style="margin:0;background:transparent">${conteudo}</body></html>`,
    )
    const png = await pagina.screenshot({ omitBackground: true, type: 'png' })
    await writeFile(`public/icones/${icone.arquivo}`, png)
    console.log(`public/icones/${icone.arquivo}`)
  }
  // O SVG "any" também vai junto: navegador que aceita SVG no manifest usa ele.
  await writeFile(
    'public/icones/icone.svg',
    svg({ tamanho: 512, fracaoDesenho: 0.5, raio: 108, margem: 20 }),
  )
  console.log('public/icones/icone.svg')
} finally {
  await navegador.close()
}
