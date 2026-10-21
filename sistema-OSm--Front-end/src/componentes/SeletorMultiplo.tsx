// Genérico no tipo do valor: serve tanto para setores (string) quanto para lojas, cujos
// ids são numéricos.
interface OpcaoSelecaoMultipla<T> {
  valor: T
  rotulo: string
}

interface SeletorMultiploProps<T> {
  opcoes: OpcaoSelecaoMultipla<T>[]
  selecionados: T[]
  aoAlterar: (selecionados: T[]) => void
  selecaoUnica?: boolean
}

export function SeletorMultiplo<T extends string | number>({
  opcoes,
  selecionados,
  aoAlterar,
  selecaoUnica = false,
}: SeletorMultiploProps<T>) {
  function aoClicarOpcao(valor: T) {
    if (selecaoUnica) {
      aoAlterar([valor])
      return
    }

    aoAlterar(
      selecionados.includes(valor)
        ? selecionados.filter((item) => item !== valor)
        : [...selecionados, valor],
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map((opcao) => {
        const ativo = selecionados.includes(opcao.valor)

        return (
          <button
            key={opcao.valor}
            type="button"
            onClick={() => aoClicarOpcao(opcao.valor)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              ativo
                ? 'bg-marca-600 text-white shadow-sm shadow-marca-600/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {opcao.rotulo}
          </button>
        )
      })}
    </div>
  )
}
