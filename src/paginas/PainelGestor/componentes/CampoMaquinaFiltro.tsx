import { useId, useState, type KeyboardEvent } from 'react'
import { Cog, Search } from 'lucide-react'
import { CampoTexto } from '../../../componentes/CampoTexto'
import { ImagemProgressiva } from '../../../componentes/ImagemProgressiva'
import type { Maquina } from '../../../tipos/maquina'

interface CampoMaquinaFiltroProps {
  maquinas: Maquina[]
  valor: string
  aoMudar: (valor: string) => void
}

function normalizar(texto: string) {
  return texto.trim().toLowerCase()
}

// Campo "Máquina" do filtro do Gestor. Era um <datalist>, mas a lista nativa do navegador
// não aceita estilo (saía com fundo preto) e só mostra o nome — e máquinas iguais têm o
// mesmo nome. Aqui cada sugestão traz foto, nome, patrimônio e loja; escolher uma grava o
// PATRIMÔNIO no filtro (o filtro casa nome ou patrimônio), então a escolha chega numa
// máquina só. Digitar texto livre continua valendo: "Forno" pega todos os fornos.
export function CampoMaquinaFiltro({ maquinas, valor, aoMudar }: CampoMaquinaFiltroProps) {
  const idLista = useId()
  const [aberta, setAberta] = useState(false)
  const [destacada, setDestacada] = useState(0)

  const termo = normalizar(valor)
  const sugestoes = maquinas.filter(
    (maquina) =>
      !termo ||
      normalizar(maquina.nome).includes(termo) ||
      normalizar(maquina.numeroPatrimonio ?? '').includes(termo),
  )
  const escolhida = termo
    ? maquinas.find((maquina) => normalizar(maquina.numeroPatrimonio ?? '') === termo)
    : undefined

  function escolher(maquina: Maquina) {
    aoMudar(maquina.numeroPatrimonio || maquina.nome)
    setAberta(false)
  }

  function aoTeclar(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault()
      if (!aberta) {
        setAberta(true)
        return
      }
      const passo = evento.key === 'ArrowDown' ? 1 : -1
      setDestacada((atual) => (atual + passo + sugestoes.length) % Math.max(sugestoes.length, 1))
    } else if (evento.key === 'Enter' && aberta && sugestoes[destacada]) {
      // Sem isso o Enter enviaria o formulário em vez de escolher a máquina.
      evento.preventDefault()
      escolher(sugestoes[destacada])
    } else if (evento.key === 'Escape' && aberta) {
      // Fecha só a lista; o Esc não deve chegar ao modal.
      evento.stopPropagation()
      setAberta(false)
    }
  }

  return (
    <div className="relative">
      <CampoTexto
        rotulo="Máquina"
        role="combobox"
        aria-expanded={aberta}
        aria-controls={idLista}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Nome ou patrimônio da máquina..."
        icone={<Search size={16} className="text-marca-500" />}
        value={valor}
        onChange={(evento) => {
          aoMudar(evento.target.value)
          setDestacada(0)
          setAberta(true)
        }}
        onFocus={() => setAberta(true)}
        onClick={() => setAberta(true)}
        onBlur={() => setAberta(false)}
        onKeyDown={aoTeclar}
      />

      {escolhida && !aberta && (
        <p className="mt-1 truncate text-xs text-slate-500">
          {escolhida.nome}
          {escolhida.lojaNome && ` · ${escolhida.lojaNome}`}
        </p>
      )}

      {aberta && (
        <ul
          id={idLista}
          role="listbox"
          className="shadow-pop absolute inset-x-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-xl bg-white p-1"
        >
          {sugestoes.length === 0 && (
            <li className="px-3 py-2 text-xs text-slate-400">Nenhuma máquina encontrada.</li>
          )}
          {sugestoes.map((maquina, indice) => (
            <li
              key={maquina.id}
              role="option"
              aria-selected={indice === destacada}
              // mouseDown e não click: o click chega depois do blur do campo, que já teria
              // fechado a lista.
              onMouseDown={(evento) => {
                evento.preventDefault()
                escolher(maquina)
              }}
              onMouseEnter={() => setDestacada(indice)}
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 ${
                indice === destacada ? 'bg-marca-100' : ''
              }`}
            >
              {maquina.fotoUrl ? (
                <ImagemProgressiva
                  src={maquina.fotoUrl}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-md object-cover"
                />
              ) : (
                <span className="bg-marca-600 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white">
                  <Cog size={16} />
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-800">
                  {maquina.nome}
                </span>
                <span className="block truncate font-mono text-xs text-slate-500">
                  {[
                    maquina.numeroPatrimonio && `Patrimônio ${maquina.numeroPatrimonio}`,
                    maquina.lojaNome,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
