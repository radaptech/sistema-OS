interface EsqueletoProps {
  className?: string
}

// Bloco de carregamento no formato do conteúdo que está por vir. Prefira isso a um texto
// "Carregando...": o layout já nasce no lugar certo, então nada salta quando os dados
// chegam, e a espera parece menor porque a tela mostra a estrutura em vez de um vazio.
//
// A varredura (`animate-varrer`) termina fora da área visível de propósito: com
// `prefers-reduced-motion` o navegador congela no estado final e sobra só o bloco cinza,
// que continua comunicando "carregando" sem nenhum movimento.
export function Esqueleto({ className = '' }: EsqueletoProps) {
  return (
    <span
      aria-hidden="true"
      className={`relative block overflow-hidden rounded-md bg-slate-200/80 ${className}`}
    >
      <span className="animate-varrer absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </span>
  )
}

interface EsqueletoListaProps {
  // Quantos blocos exibir. Use um número próximo do que a tela costuma carregar — muito
  // acima disso vira uma parede cinza que só assusta.
  quantidade?: number
  children: React.ReactNode
}

// Repete um mesmo esqueleto e já anuncia a espera para leitores de tela (o conteúdo em si
// é aria-hidden, então sem isso a troca aconteceria em silêncio).
export function EsqueletoLista({ quantidade = 4, children }: EsqueletoListaProps) {
  return (
    <div role="status" aria-busy="true" aria-label="Carregando conteúdo" className="contents">
      {Array.from({ length: quantidade }, (_, indice) => (
        <div key={indice} className="contents">
          {children}
        </div>
      ))}
    </div>
  )
}

// Esqueleto no formato dos cards de listagem do Administrador e dos painéis: faixa do
// número da OS, título, uma linha de apoio e o botão de ação à direita.
export function EsqueletoCardOS() {
  return (
    <div className="shadow-card flex flex-col gap-3 rounded-xl bg-white p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Esqueleto className="h-9 w-9 shrink-0 rounded-lg" />
          <Esqueleto className="h-4 w-40 max-w-[45%]" />
          <Esqueleto className="h-5 w-24 rounded-full" />
        </div>
        <Esqueleto className="mt-2 h-3 w-64 max-w-[80%]" />
        <Esqueleto className="mt-2 h-3 w-48 max-w-[60%]" />
      </div>
      <Esqueleto className="h-10 w-full rounded-xl sm:w-32" />
    </div>
  )
}

// Esqueleto das listagens simples de cadastro (Usuários, Lojas, Setores, Máquinas,
// Empresas Terceirizadas): identificação à esquerda, ações à direita.
export function EsqueletoLinhaCadastro() {
  return (
    <div className="shadow-card flex flex-col gap-3 rounded-xl bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Esqueleto className="h-4 w-36 max-w-[50%]" />
          <Esqueleto className="h-5 w-20 rounded-full" />
        </div>
        <Esqueleto className="mt-2 h-3 w-52 max-w-[70%]" />
      </div>
      <div className="flex gap-2 sm:shrink-0">
        <Esqueleto className="h-10 w-11 rounded-xl" />
        <Esqueleto className="h-10 w-11 rounded-xl" />
      </div>
    </div>
  )
}
