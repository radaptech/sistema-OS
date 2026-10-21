import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Building2, Printer, XCircle } from 'lucide-react'
import { Botao } from '../../componentes/Botao'
import { BadgeStatusExecucao } from '../../componentes/BadgeStatusExecucao'
import { BadgeTipoOS } from '../../componentes/BadgeTipoOS'
import { BadgeOrigemOS } from '../../componentes/BadgeOrigemOS'
import { BadgeUrgencia } from '../../componentes/BadgeUrgencia'
import { LinhaDoTempoOS } from '../../componentes/LinhaDoTempoOS'
import { MiniaturaFoto } from '../../componentes/MiniaturaFoto'
import { obterNomeAlvo, obterCodigoAlvo } from '../../utilitarios/alvoOS'
import { formatarDataHora } from '../../utilitarios/formatarData'
import { formatarHoras } from '../../utilitarios/formatarHoras'
import { formatarMoeda } from '../../utilitarios/formatarMoeda'
import { rotulosCustoOS } from '../../utilitarios/rotulosCustoOS'
import type { OrdemServico } from '../../tipos/ordemServico'
import { useSaidaAnimada } from '../../hooks/useSaidaAnimada'
import { useDialogo } from '../../hooks/useDialogo'

interface ModalDetalhesOSProps {
  ordemServico: OrdemServico
  aoFechar: () => void
  autoImprimir?: boolean
  contexto?: string
}

export function ModalDetalhesOS({
  ordemServico,
  aoFechar,
  autoImprimir = false,
  contexto = 'Painel do Administrador',
}: ModalDetalhesOSProps) {
  const { fechar, classeFundo, classeCartao } = useSaidaAnimada(aoFechar)

  // Nome da loja, do técnico e da empresa vêm resolvidos na própria OS; horas e custo
  // total vêm calculados do servidor.
  const custo = ordemServico.custo
  // Sem o marcador "Afeta Produção" a máquina seguiu operando: não há tempo de parada a
  // reportar, e o servidor nem devolve `horasParada`.
  const horasParada = ordemServico.afetaProducao
    ? ordemServico.horasParada
    : undefined

  useEffect(() => {
    if (!autoImprimir) {
      return
    }

    const temporizador = setTimeout(() => window.print(), 200)
    return () => clearTimeout(temporizador)
  }, [autoImprimir])

  // Na impressão o modal deixa de ser `fixed` (o navegador repete elemento fixo em toda página
  // impressa) e vira bloco normal, sem fundo, sombra, corte nem largura máxima. Ver o
  // `@media print` de index.css.
  const { propsDialogo, idTitulo } = useDialogo(fechar)

  return createPortal(
    <div className={`${classeFundo} fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm print:static print:block print:bg-transparent print:p-0 print:backdrop-blur-none`}>
      <div {...propsDialogo} className={`${classeCartao} shadow-pop w-full max-w-lg overflow-hidden rounded-2xl bg-white print:max-w-none print:overflow-visible print:rounded-none print:shadow-none`}>
        <div className="flex items-start justify-between bg-marca-600 px-6 py-4 print:hidden">
          <div>
            <p className="font-mono text-xs font-bold tracking-widest text-white/80 uppercase">
              {contexto}
            </p>
            <p id={idTitulo} className="font-display text-lg font-bold text-white">
              OS #{ordemServico.id} · Detalhes
            </p>
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

        <div
          id="area-impressao-os"
          className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto p-6"
        >
          <div className="hidden print:block">
            <p className="font-mono text-xs font-bold tracking-widest text-slate-500 uppercase">
              Solicitação OS
            </p>
            <p className="font-display text-lg font-bold text-slate-800">
              Ordem de Serviço #{ordemServico.id}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display font-semibold text-slate-800">
                {obterNomeAlvo(ordemServico)}
              </p>
              <p className="font-mono text-sm text-slate-400">
                {obterCodigoAlvo(ordemServico)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <BadgeStatusExecucao status={ordemServico.statusExecucao} />
              <BadgeTipoOS tipo={ordemServico.tipo} />
              <BadgeOrigemOS origem={ordemServico.origem} />
              {ordemServico.urgencia && (
                <BadgeUrgencia urgencia={ordemServico.urgencia} />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-mono text-xs font-semibold tracking-wide text-slate-400 uppercase">
                Loja
              </p>
              <p className="text-slate-700">{ordemServico.lojaNome}</p>
            </div>
            <div>
              <p className="font-mono text-xs font-semibold tracking-wide text-slate-400 uppercase">
                Setor
              </p>
              <p className="text-slate-700">{ordemServico.setorNome}</p>
            </div>
            <div>
              <p className="font-mono text-xs font-semibold tracking-wide text-slate-400 uppercase">
                Tipo de OS
              </p>
              <p className="text-slate-700">
                {ordemServico.tipoDefeito ?? '—'}
              </p>
            </div>
            <div>
              <p className="font-mono text-xs font-semibold tracking-wide text-slate-400 uppercase">
                Solicitante
              </p>
              <p className="text-slate-700">
                {ordemServico.solicitanteNome ?? '—'}
              </p>
            </div>
            <div>
              <p className="font-mono text-xs font-semibold tracking-wide text-slate-400 uppercase">
                Técnico Responsável
              </p>
              <p className="text-slate-700">
                {ordemServico.tecnicoNome
                  ? `${ordemServico.tecnicoNome} — ${ordemServico.tecnicoArea ?? ''}`
                  : '—'}
              </p>
            </div>
            {/* Terceirizada é acréscimo, não substituição: o Técnico continua dono da OS
                mesmo quando a execução foi de uma empresa externa. */}
            {ordemServico.empresaTerceirizadaNome && (
              <div>
                <p className="font-mono text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  Empresa Terceirizada
                </p>
                <p className="mt-0.5 flex items-center gap-2 text-slate-700">
                  <MiniaturaFoto
                    fotoUrl={ordemServico.empresaTerceirizadaFotoUrl}
                    alt={ordemServico.empresaTerceirizadaNome}
                    Icone={Building2}
                    className="h-8 w-8 rounded-md"
                    tamanhoIcone={14}
                  />
                  {ordemServico.empresaTerceirizadaNome}
                </p>
              </div>
            )}
            {/* Exibida junto da abertura porque é daqui que parte Horas Parada — sem ela o
                número ficaria sem origem visível. */}
            <div>
              <p className="font-mono text-xs font-semibold tracking-wide text-slate-400 uppercase">
                Solicitada em
              </p>
              <p className="font-mono text-slate-700">
                {formatarDataHora(ordemServico.dataSolicitacao)}
              </p>
            </div>
            <div>
              <p className="font-mono text-xs font-semibold tracking-wide text-slate-400 uppercase">
                Abertura da OS
              </p>
              <p className="font-mono text-slate-700">
                {formatarDataHora(ordemServico.dataAbertura)}
              </p>
            </div>
            <div>
              <p className="font-mono text-xs font-semibold tracking-wide text-slate-400 uppercase">
                Início / Término
              </p>
              <p className="font-mono text-slate-700">
                {ordemServico.dataInicio
                  ? formatarDataHora(ordemServico.dataInicio)
                  : '—'}{' '}
                até{' '}
                {ordemServico.dataFim
                  ? formatarDataHora(ordemServico.dataFim)
                  : '—'}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="mb-2 font-mono text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Custos
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-400">Horas Trabalhadas</p>
                <p className="font-mono font-semibold text-slate-700">
                  {ordemServico.horasTrabalhadas !== undefined
                    ? formatarHoras(ordemServico.horasTrabalhadas)
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Horas Parada</p>
                <p className="font-mono font-semibold text-slate-700">
                  {horasParada !== undefined
                    ? formatarHoras(horasParada)
                    : ordemServico.afetaProducao
                      ? '—'
                      : 'Não se aplica'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{rotulosCustoOS.custoMaoDeObra}</p>
                <p className="font-mono font-semibold text-slate-700">
                  {custo?.custoHoraTecnico != null
                    ? formatarMoeda(custo.custoHoraTecnico)
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{rotulosCustoOS.custoMaterial}</p>
                <p className="font-mono font-semibold text-slate-700">
                  {custo ? formatarMoeda(custo.custoManutencao) : '—'}
                </p>
              </div>
            </div>
            {/* A discriminação por trás dos dois totais acima. Some quando a OS é
                anterior à migration 000012 e não tem itens: os totais continuam certos,
                só não há de que eles são feitos. */}
            {custo && custo.itens.length > 0 && (
              <div className="mt-3 border-t border-slate-200 pt-3">
                <p className="text-xs text-slate-400">Composição do Custo</p>
                <ul className="mt-1 flex flex-col gap-1">
                  {custo.itens.map((item) => (
                    <li key={item.id} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-slate-700">{item.descricao}</span>
                      {/* Os dois valores da tarefa, sempre nessa ordem. A hora só aparece
                          quando existe: fora de maquinário a coluna é proibida, e dentro
                          dele a tarefa pode não ter cobrado mão de obra. */}
                      <span className="font-mono whitespace-nowrap text-slate-700">
                        <span className="font-semibold">{formatarMoeda(item.custoManutencao)}</span>
                        {item.custoHoraTecnico !== null && (
                          <span className="ml-2 text-xs text-slate-400">
                            + {formatarMoeda(item.custoHoraTecnico)}{' '}
                            {ordemServico.tipo === 'terceiros' ? 'de mão de obra' : 'de hora'}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-3 border-t border-slate-200 pt-3">
              <p className="text-xs text-slate-400">Custo Total</p>
              <p className="text-marca-800 font-mono text-lg font-bold">
                {custo ? formatarMoeda(custo.custoTotal) : '—'}
              </p>
            </div>
            {custo && custo.notasFiscais.length > 0 && (
              <div className="mt-3 border-t border-slate-200 pt-3">
                <p className="text-xs text-slate-400">
                  {custo.notasFiscais.length > 1 ? 'Notas Fiscais' : 'Nota Fiscal'}
                </p>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {custo.notasFiscais.map((nota) => (
                    <li key={nota.id} className="font-mono text-sm font-semibold text-slate-700">
                      {nota.numero}
                      {nota.serie ? ` / série ${nota.serie}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {custo?.descricaoServicoTerceiro && (
              <div className="mt-3 border-t border-slate-200 pt-3">
                <p className="text-xs text-slate-400">Descrição do Serviço</p>
                <p className="text-sm text-slate-700">{custo.descricaoServicoTerceiro}</p>
              </div>
            )}
          </div>

          <div>
            <p className="font-mono text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Defeito Constatado
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {ordemServico.encerramento?.defeitoConstatado ?? '—'}
            </p>
          </div>

          <div>
            <p className="font-mono text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Causa Raiz
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {ordemServico.encerramento?.causaRaiz ?? '—'}
            </p>
          </div>

          <div>
            <p className="font-mono text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Solução Aplicada
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {ordemServico.encerramento?.solucao ?? '—'}
            </p>
          </div>

          <LinhaDoTempoOS ordemServicoId={ordemServico.id} />

          <div className="mt-1 flex gap-3 print:hidden">
            <div className="flex-1">
              <Botao type="button" variante="secundario" onClick={fechar}>
                Fechar
              </Botao>
            </div>
            <div className="flex-1">
              <Botao
                type="button"
                onClick={() => window.print()}
                className="flex items-center justify-center gap-2"
              >
                <Printer size={16} />
                Imprimir
              </Botao>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
