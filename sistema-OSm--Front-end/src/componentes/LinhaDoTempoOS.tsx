import { useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  CircleDot,
  History,
  PauseCircle,
  PlayCircle,
  Receipt,
  Truck,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useHistoricoOrdemServico } from '../hooks/useHistoricoOrdemServico'
import { formatarDataHora } from '../utilitarios/formatarData'
import { formatarMoeda } from '../utilitarios/formatarMoeda'
import type {
  DetalhesEventoOS,
  EventoOrdemServico,
  SnapshotCustoOS,
  TipoEventoOS,
} from '../tipos/eventoOrdemServico'
import { Esqueleto } from './Esqueleto'

interface LinhaDoTempoOSProps {
  ordemServicoId: number
}

const APARENCIA: Record<TipoEventoOS, { Icone: LucideIcon; estilo: string }> = {
  aberta: { Icone: CircleDot, estilo: 'bg-slate-200 text-slate-600' },
  iniciada: { Icone: PlayCircle, estilo: 'bg-sky-100 text-sky-700' },
  pausada: { Icone: PauseCircle, estilo: 'bg-amber-100 text-amber-700' },
  retomada: { Icone: PlayCircle, estilo: 'bg-sky-100 text-sky-700' },
  terceiro_acionado: { Icone: Truck, estilo: 'bg-slate-200 text-slate-600' },
  encerrada: { Icone: CheckCircle2, estilo: 'bg-emerald-100 text-emerald-700' },
  custo_corrigido: { Icone: Wallet, estilo: 'bg-amber-100 text-amber-700' },
}

const ORIGEM_ABERTURA: Record<string, string> = {
  solicitante: 'a pedido do solicitante',
  direta: 'abertura direta',
  preventiva: 'preventiva agendada',
}

// Quem fez: nome + perfil quando há autor; sem autor só existe na OS aberta pelo calendário.
function autorDe(evento: EventoOrdemServico): string {
  if (!evento.usuarioNome) {
    return 'Sistema'
  }
  return evento.usuarioNome
}

function tituloDe(evento: EventoOrdemServico): string {
  const autor = autorDe(evento)
  const detalhes = evento.detalhes

  switch (evento.tipo) {
    case 'aberta':
      return evento.usuarioNome
        ? `OS aberta por ${autor}`
        : 'OS aberta automaticamente'
    case 'iniciada':
      return `Atendimento iniciado por ${autor}`
    case 'pausada':
      return `OS pausada por ${autor}`
    case 'retomada':
      return `OS retomada por ${autor}`
    case 'terceiro_acionado':
      return detalhes?.empresaTerceirizadaNome
        ? `${autor} acionou ${detalhes.empresaTerceirizadaNome}`
        : `${autor} acionou uma empresa terceirizada`
    case 'encerrada':
      return `OS encerrada por ${autor}`
    case 'custo_corrigido':
      return `Custo corrigido por ${autor}`
  }
}

// Eventos de iniciar/pausar/retomar/terceiro anteriores ao histórico foram reconstituídos
// com o técnico da OS: a autoria é presumida e a tela diz isso em vez de afirmar.
function ehAutoriaPresumida(evento: EventoOrdemServico): boolean {
  return (
    evento.detalhes?.retroativo === true &&
    ['iniciada', 'pausada', 'retomada', 'terceiro_acionado'].includes(evento.tipo)
  )
}

function snapshotDe(detalhes: DetalhesEventoOS | null): SnapshotCustoOS | null {
  return detalhes && detalhes.itens && detalhes.custoTotal !== undefined
    ? (detalhes as SnapshotCustoOS)
    : null
}

function ListaDoSnapshot({ snapshot }: { snapshot: SnapshotCustoOS }) {
  return (
    <details className="mt-1.5 text-xs text-slate-500">
      <summary className="cursor-pointer font-medium text-slate-600">
        Ver tarefas e notas deste lançamento
      </summary>
      <ul className="mt-1.5 flex flex-col gap-1">
        {snapshot.itens.map((item) => (
          <li key={item.id} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate">{item.descricao}</span>
            <span className="font-mono whitespace-nowrap text-slate-700">
              {formatarMoeda(item.custoManutencao)}
              {item.custoHoraTecnico !== null && (
                <span className="text-slate-400"> + {formatarMoeda(item.custoHoraTecnico)}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
      {snapshot.notasFiscais.length > 0 && (
        <p className="mt-1.5 flex items-center gap-1 font-mono">
          <Receipt size={12} />
          {snapshot.notasFiscais
            .map((nota) => (nota.serie ? `${nota.numero}/${nota.serie}` : nota.numero))
            .join(' · ')}
        </p>
      )}
    </details>
  )
}

interface ItemDaLinhaProps {
  evento: EventoOrdemServico
  // Custo vigente ANTES deste evento (o do `encerrada` ou da correção anterior).
  custoAnterior: SnapshotCustoOS | null
  ultimo: boolean
}

function ItemDaLinha({ evento, custoAnterior, ultimo }: ItemDaLinhaProps) {
  const { Icone, estilo } = APARENCIA[evento.tipo]
  const detalhes = evento.detalhes
  const snapshot = snapshotDe(detalhes)

  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!ultimo && (
        <span aria-hidden className="absolute top-8 bottom-0 left-4 w-px bg-slate-200" />
      )}
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${estilo}`}
      >
        <Icone size={16} />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-semibold text-slate-700">{tituloDe(evento)}</p>
        <p className="font-mono text-xs text-slate-400">
          {formatarDataHora(evento.ocorridoEm)}
          {evento.usuarioPerfil && ` · ${evento.usuarioPerfil}`}
          {evento.tipo === 'aberta' && detalhes?.origem && ` · ${ORIGEM_ABERTURA[detalhes.origem]}`}
        </p>

        {evento.tipo === 'pausada' && detalhes?.motivo && (
          <p className="mt-1 text-sm text-slate-600">“{detalhes.motivo}”</p>
        )}

        {evento.tipo === 'encerrada' && snapshot && (
          <>
            <p className="mt-1 text-sm text-slate-600">
              Lançou <span className="font-mono font-semibold">{formatarMoeda(snapshot.custoTotal)}</span> de custo
              {detalhes?.tipoDefeito ? ` · ${detalhes.tipoDefeito}` : ''}
            </p>
            <ListaDoSnapshot snapshot={snapshot} />
          </>
        )}

        {evento.tipo === 'custo_corrigido' && snapshot && (
          <>
            <p className="mt-1 text-sm text-slate-600">
              {custoAnterior && custoAnterior.custoTotal !== snapshot.custoTotal ? (
                <>
                  Custo total{' '}
                  <span className="font-mono text-slate-400 line-through">
                    {formatarMoeda(custoAnterior.custoTotal)}
                  </span>{' '}
                  →{' '}
                  <span className="font-mono font-semibold">{formatarMoeda(snapshot.custoTotal)}</span>
                </>
              ) : (
                <>
                  Custo total mantido em{' '}
                  <span className="font-mono font-semibold">{formatarMoeda(snapshot.custoTotal)}</span>
                </>
              )}
            </p>
            <ListaDoSnapshot snapshot={snapshot} />
          </>
        )}

        {ehAutoriaPresumida(evento) && (
          <p className="mt-1 text-xs text-slate-400">
            Registro anterior ao histórico: autor presumido (técnico da OS).
          </p>
        )}
      </div>
    </li>
  )
}

function custosAntesDeCadaEvento(eventos: EventoOrdemServico[]): (SnapshotCustoOS | null)[] {
  const anteriores: (SnapshotCustoOS | null)[] = []
  let vigente: SnapshotCustoOS | null = null

  for (const evento of eventos) {
    anteriores.push(vigente)
    vigente = snapshotDe(evento.detalhes) ?? vigente
  }

  return anteriores
}

// Linha do tempo da OS: quem fez cada passo e quando, com o custo a cada lançamento. Só busca
// quando aberta. A correção do Administrador apaga a itemização do Técnico das tabelas de
// custo, e é aqui que o que ele lançou continua visível.
export function LinhaDoTempoOS({ ordemServicoId }: LinhaDoTempoOSProps) {
  const [aberta, setAberta] = useState(false)
  const { data: eventos, isPending, isError } = useHistoricoOrdemServico(ordemServicoId, aberta)

  // O custo vigente antes de cada evento, para a correção mostrar "de → para".
  const custosAnteriores = custosAntesDeCadaEvento(eventos ?? [])

  return (
    <div className="rounded-xl bg-slate-50 p-4 print:hidden">
      <button
        type="button"
        aria-expanded={aberta}
        onClick={() => setAberta((valor) => !valor)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 font-mono text-xs font-semibold tracking-wide text-slate-400 uppercase">
          <History size={14} />
          Histórico da OS
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${aberta ? 'rotate-180' : ''}`}
        />
      </button>

      {aberta && (
        <div className="mt-3">
          {isPending && (
            <div className="flex flex-col gap-3">
              <Esqueleto className="h-10 w-full" />
              <Esqueleto className="h-10 w-full" />
            </div>
          )}
          {isError && (
            <p className="text-sm text-slate-500">Não foi possível carregar o histórico.</p>
          )}
          {eventos && eventos.length === 0 && (
            <p className="text-sm text-slate-500">Nenhum passo registrado.</p>
          )}
          {eventos && eventos.length > 0 && (
            <ol className="flex flex-col">
              {eventos.map((evento, indice) => (
                <ItemDaLinha
                  key={evento.id}
                  evento={evento}
                  custoAnterior={custosAnteriores[indice]}
                  ultimo={indice === eventos.length - 1}
                />
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}
