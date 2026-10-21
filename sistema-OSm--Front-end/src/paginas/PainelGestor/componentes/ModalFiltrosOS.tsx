import { useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Filter, RotateCcw, XCircle } from 'lucide-react'
import { Botao } from '../../../componentes/Botao'
import { CampoSelecao } from '../../../componentes/CampoSelecao'
import { CampoTexto } from '../../../componentes/CampoTexto'
import type { Loja } from '../../../tipos/loja'
import { FILTROS_AVANCADOS_OS_VAZIOS, type FiltrosAvancadosOS } from '../filtrosOS'
import { useSaidaAnimada } from '../../../hooks/useSaidaAnimada'
import { useMaquinas } from '../../../hooks/useMaquinas'
import { CampoMaquinaFiltro } from './CampoMaquinaFiltro'
import { useDialogo } from '../../../hooks/useDialogo'

interface ModalFiltrosOSProps {
  lojas: Loja[]
  filtros: FiltrosAvancadosOS
  aoFechar: () => void
  aoAplicar: (filtros: FiltrosAvancadosOS) => void
}

export function ModalFiltrosOS({
  lojas,
  filtros,
  aoFechar,
  aoAplicar,
}: ModalFiltrosOSProps) {
  const { fechar, classeFundo, classeCartao } = useSaidaAnimada(aoFechar)

  const [rascunho, setRascunho] = useState<FiltrosAvancadosOS>(filtros)

  // As sugestões são as máquinas do escopo do Gestor (GET /maquinas, recortado pelo
  // servidor), não as que aparecem nas solicitações/OS carregadas: o painel só busca a
  // lista da aba aberta, e na aba de preventivas a sugestão saía vazia. Com loja
  // escolhida, só as dela. Máquinas iguais ficam juntas, em ordem de patrimônio.
  const { data: maquinasEscopo = [] } = useMaquinas()
  const maquinasSugeridas = maquinasEscopo
    .filter((maquina) => !rascunho.loja || maquina.lojaId === Number(rascunho.loja))
    .sort(
      (a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR') ||
        (a.numeroPatrimonio ?? '').localeCompare(b.numeroPatrimonio ?? '', 'pt-BR', {
          numeric: true,
        }),
    )

  const dataInvalida =
    !!rascunho.dataInicio && !!rascunho.dataFim && rascunho.dataInicio > rascunho.dataFim
  const valorInvalido =
    rascunho.valorMinimo !== '' &&
    rascunho.valorMaximo !== '' &&
    Number(rascunho.valorMinimo) > Number(rascunho.valorMaximo)

  function atualizarCampo<Campo extends keyof FiltrosAvancadosOS>(
    campo: Campo,
    valor: FiltrosAvancadosOS[Campo],
  ) {
    setRascunho((atual) => ({ ...atual, [campo]: valor }))
  }

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault()

    if (dataInvalida || valorInvalido) {
      return
    }

    aoAplicar(rascunho)
  }

  const { propsDialogo, idTitulo } = useDialogo(fechar)

  return createPortal(
    <div className={`${classeFundo} fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm`}>
      <div {...propsDialogo} className={`${classeCartao} w-full max-w-md rounded-2xl bg-white shadow-pop`}>
        <div className="flex items-start justify-between rounded-t-2xl bg-marca-600 px-6 py-4">
          <div>
            <p className="font-mono text-xs font-bold tracking-widest text-white/80 uppercase">
              Painel do Gestor
            </p>
            <p id={idTitulo} className="font-display text-lg font-bold text-white">Filtrar OS</p>
            <p className="text-xs text-white/80">Loja, máquina, período e valores</p>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={fechar}
            className="text-white/90 transition hover:text-white"
          >
            <XCircle size={22} />
          </button>
        </div>

        <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-5 p-6">
          <CampoSelecao
            rotulo="Loja"
            value={rascunho.loja}
            onChange={(evento) => atualizarCampo('loja', evento.target.value)}
          >
            <option value="">Todas as lojas</option>
            {lojas.map((loja) => (
              <option key={loja.id} value={loja.id}>
                {loja.nome}
              </option>
            ))}
          </CampoSelecao>

          <CampoMaquinaFiltro
            maquinas={maquinasSugeridas}
            valor={rascunho.maquina}
            aoMudar={(valor) => atualizarCampo('maquina', valor)}
          />

          <div className="flex flex-col gap-1">
            <div className="grid grid-cols-2 gap-4">
              <CampoTexto
                rotulo="De"
                type="date"
                value={rascunho.dataInicio}
                onChange={(evento) => atualizarCampo('dataInicio', evento.target.value)}
              />
              <CampoTexto
                rotulo="Até"
                type="date"
                value={rascunho.dataFim}
                onChange={(evento) => atualizarCampo('dataFim', evento.target.value)}
              />
            </div>
            {dataInvalida && (
              <span className="text-xs text-red-500">
                A data final não pode ser anterior à data inicial.
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <div className="grid grid-cols-2 gap-4">
              <CampoTexto
                rotulo="Valor Mínimo (R$)"
                type="number"
                min={0}
                step="0.01"
                placeholder="0,00"
                value={rascunho.valorMinimo}
                onChange={(evento) => atualizarCampo('valorMinimo', evento.target.value)}
              />
              <CampoTexto
                rotulo="Valor Máximo (R$)"
                type="number"
                min={0}
                step="0.01"
                placeholder="0,00"
                value={rascunho.valorMaximo}
                onChange={(evento) => atualizarCampo('valorMaximo', evento.target.value)}
              />
            </div>
            {valorInvalido && (
              <span className="text-xs text-red-500">
                O valor máximo não pode ser menor que o mínimo.
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400">
            O filtro de valor considera o custo total já lançado na OS (Custo Hora do
            Técnico + Custo de Manutenção) — solicitações e OS ainda em andamento não têm
            valor final e ficam de fora quando esse filtro está ativo.
          </p>

          <div className="mt-1 flex gap-3">
            <div className="flex-1">
              <Botao
                type="button"
                variante="secundario"
                onClick={() => setRascunho(FILTROS_AVANCADOS_OS_VAZIOS)}
                className="flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} />
                Limpar
              </Botao>
            </div>
            <div className="flex-1">
              <Botao
                type="submit"
                disabled={dataInvalida || valorInvalido}
                className="flex items-center justify-center gap-2"
              >
                <Filter size={14} />
                Aplicar Filtros
              </Botao>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
