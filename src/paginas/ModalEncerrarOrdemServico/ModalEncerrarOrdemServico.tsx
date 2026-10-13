import { createPortal } from 'react-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Alternador } from '../../componentes/Alternador'
import { Botao } from '../../componentes/Botao'
import { CampoItensCusto } from '../../componentes/CampoItensCusto'
import { CampoSelecao } from '../../componentes/CampoSelecao'
import { CampoTextoArea } from '../../componentes/CampoTextoArea'
import { calcularHoras } from '../../utilitarios/calcularHoras'
import { formatarHoras } from '../../utilitarios/formatarHoras'
import { agoraParaBackend } from '../../utilitarios/dataBackend'
import { formatarDataHora } from '../../utilitarios/formatarData'
import { tiposDefeito, type OrdemServico } from '../../tipos/ordemServico'
import {
  esquemaEncerrarOrdemServico,
  type DadosEncerrarOrdemServico,
} from './esquemaEncerrarOrdemServico'
import { useSaidaAnimada } from '../../hooks/useSaidaAnimada'

interface DadosConfirmarEncerramento extends DadosEncerrarOrdemServico {
  dataInicio: string
  dataFim: string
  horasTrabalhadas: number
}

interface ModalEncerrarOrdemServicoProps {
  ordemServico: OrdemServico
  aoFechar: () => void
  aoSalvar: (dados: DadosConfirmarEncerramento) => void
}

export function ModalEncerrarOrdemServico({
  ordemServico,
  aoFechar,
  aoSalvar,
}: ModalEncerrarOrdemServicoProps) {
  const { fechar, classeFundo, classeCartao } = useSaidaAnimada(aoFechar)

  const dataInicio = ordemServico.dataInicio ?? ordemServico.dataAbertura
  const agora = agoraParaBackend()

  // Prévia local, só para o Técnico conferir antes de encerrar. Os valores definitivos
  // são calculados pelo servidor a partir do histórico de pausas e voltam na resposta.
  const horasTrabalhadas = calcularHoras(dataInicio, agora)
  // Só acumula parada a OS marcada como "Afeta Produção": nas demais a máquina seguiu
  // operando, então não existe tempo de parada a exibir nem a calcular. Conta desde a
  // solicitação, não desde a abertura da OS: a máquina parou quando o Solicitante relatou.
  const horasParada = ordemServico.afetaProducao
    ? calcularHoras(ordemServico.dataSolicitacao, agora)
    : undefined

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DadosEncerrarOrdemServico>({
    resolver: zodResolver(esquemaEncerrarOrdemServico),
    defaultValues: {
      tipoDefeito: undefined,
      defeitoConstatado: '',
      causaRaiz: '',
      solucao: '',
      // Uma linha em branco já no ar: a OS que o Técnico está encerrando teve algum
      // custo (mesmo que zero, em garantia), então abrir com a lista vazia obrigaria um
      // clique a mais em 100% dos casos. Uma só, e não duas: a linha já carrega os dois
      // valores, então não há um segundo "tipo de custo" para pré-criar.
      itens: [{ descricao: '', custoManutencao: undefined, custoHoraTecnico: undefined }],
      // Padrão "não teve": serviço só de mão de obra é o caso comum, e marcar nota que
      // não existe faria o Administrador cobrar um documento inexistente.
      temNotaFiscal: false,
    },
  })

  function aoSalvarFormulario(dados: DadosEncerrarOrdemServico) {
    aoSalvar({
      ...dados,
      dataInicio,
      dataFim: agora,
      horasTrabalhadas,
    })
    fechar()
  }

  return createPortal(
    <div className={`${classeFundo} fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm`}>
      <div className={`${classeCartao} shadow-pop w-full max-w-md overflow-hidden rounded-2xl bg-white`}>
        <div className="flex items-start justify-between bg-marca-600 px-6 py-4">
          <div>
            <p className="font-mono text-xs font-bold tracking-widest text-white/80 uppercase">
              Painel do Técnico
            </p>
            <p className="font-display text-lg font-bold text-white">
              Encerrar OS · #{ordemServico.id}
            </p>
            <p className="text-xs text-white/80">{ordemServico.maquinaNome}</p>
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

        <form
          onSubmit={(evento) => {
            evento.stopPropagation()
            handleSubmit(aoSalvarFormulario)(evento)
          }}
          noValidate
          className="flex max-h-[75vh] flex-col gap-5 overflow-y-auto p-6 pb-0"
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-marca-500 font-mono text-xs font-semibold tracking-wide uppercase">
              Início do Atendimento
            </span>
            <span className="text-marca-500 font-mono text-xs font-semibold tracking-wide uppercase">
              Término do Atendimento
            </span>
            <p className="rounded-xl border border-slate-200/60 bg-slate-50 px-4 py-2.5 text-slate-700 font-mono text-sm">
              {formatarDataHora(dataInicio)}
            </p>
            <p className="rounded-xl border border-slate-200/60 bg-slate-50 px-4 py-2.5 text-slate-700 font-mono text-sm">
              {formatarDataHora(agora)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-marca-500 font-mono text-xs font-semibold tracking-wide uppercase">
              Horas Trabalhadas
            </span>
            <span className="text-marca-500 font-mono text-xs font-semibold tracking-wide uppercase">
              Horas Parada
            </span>
            <p className="text-marca-800 rounded-lg bg-lime-100 px-3 py-2.5 font-mono text-sm">
              {formatarHoras(horasTrabalhadas)}
            </p>
            <p className="text-marca-800 rounded-lg bg-lime-100 px-3 py-2.5 font-mono text-sm">
              {horasParada !== undefined ? formatarHoras(horasParada) : 'Não se aplica'}
            </p>
          </div>

          <p className="text-xs text-slate-400">
            {horasParada !== undefined
              ? 'Horas Trabalhadas desconta o tempo em que a OS ficou pausada (ex: esperando peça) — Horas Parada conta corrido desde a solicitação, sem descontar pausas nem a espera pela abertura da OS.'
              : 'Horas Trabalhadas desconta o tempo em que a OS ficou pausada (ex: esperando peça). Esta OS não foi marcada como "Afeta Produção": a máquina seguiu operando, então não acumula tempo de parada.'}
          </p>

          {ordemServico.tipo === 'terceiros' && (
            <p className="rounded-lg bg-blue-50 px-3 py-2.5 text-xs text-blue-700">
              Serviço executado por {ordemServico.empresaTerceirizadaNome ?? 'empresa terceirizada'}:
              lance o Valor Peças e o Valor Mão de Obra cobrados pela empresa, separados como na
              nota fiscal dela.
            </p>
          )}

          <Controller
            control={control}
            name="itens"
            render={({ field }) => (
              <CampoItensCusto
                itens={field.value}
                aoMudar={field.onChange}
                tipo={ordemServico.tipo}
                // A mensagem do array inteiro (lista vazia, falta manutenção, hora técnica
                // fora de maquinário) vive na raiz; as de cada linha vêm indexadas.
                erro={errors.itens?.message ?? errors.itens?.root?.message}
                errosPorItem={field.value.map((_, indice) => ({
                  descricao: errors.itens?.[indice]?.descricao?.message,
                  custoManutencao: errors.itens?.[indice]?.custoManutencao?.message,
                  custoHoraTecnico: errors.itens?.[indice]?.custoHoraTecnico?.message,
                }))}
              />
            )}
          />

          {/* Você é quem sabe: só o Técnico que executou viu se houve compra. A resposta
              decide se o Administrador verá os campos de Número/Série da nota em Custos
              Pendentes — se ficar desmarcado, ele só confere os valores. Zero custo é
              válido nos campos acima (garantia, serviço sem peça) e não implica nada aqui. */}
          <Controller
            control={control}
            name="temNotaFiscal"
            render={({ field }) => (
              <Alternador
                id={field.name}
                rotulo="Teve nota fiscal?"
                descricao="Marque se a OS gerou nota (peça, material ou serviço de terceiro). O número fica com o Administrador."
                marcado={field.value}
                aoAlternar={field.onChange}
              />
            )}
          />

          <CampoSelecao
            rotulo="Tipo de OS *"
            mensagemErro={errors.tipoDefeito?.message}
            {...register('tipoDefeito', {
              setValueAs: (valor) => (valor === '' ? undefined : valor),
            })}
          >
            <option value="">Selecione o tipo...</option>
            {tiposDefeito.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </CampoSelecao>

          <CampoTextoArea
            rotulo="Defeito Constatado *"
            rows={3}
            maxLength={500}
            placeholder="Descreva o defeito efetivamente constatado na máquina..."
            mensagemErro={errors.defeitoConstatado?.message}
            {...register('defeitoConstatado')}
          />

          <CampoTextoArea
            rotulo="Causa Raiz *"
            rows={3}
            maxLength={500}
            placeholder="Descreva a causa raiz identificada..."
            mensagemErro={errors.causaRaiz?.message}
            {...register('causaRaiz')}
          />

          <CampoTextoArea
            rotulo="Solução Aplicada *"
            rows={3}
            maxLength={500}
            placeholder="Descreva a solução aplicada para resolver o problema..."
            mensagemErro={errors.solucao?.message}
            {...register('solucao')}
          />

          {/* Grudado no rodapé da área que rola: com várias linhas de custo o par
              Cancelar/Salvar saía da dobra e a ação principal do modal virava uma
              caçada. Os negativos cancelam o padding do <form> para a faixa branca
              cobrir a largura toda, senão o conteúdo aparece por baixo nas bordas. */}
          <div className="sticky bottom-0 -mx-6 mt-1 flex gap-3 border-t border-slate-100 bg-white px-6 pt-4 pb-6">
            <div className="flex-1">
              <Botao type="button" variante="secundario" onClick={fechar}>
                Cancelar
              </Botao>
            </div>
            <div className="flex-1">
              <Botao
                type="submit"
                className="flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                Encerrar OS
              </Botao>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
