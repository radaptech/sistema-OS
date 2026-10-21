import { createPortal } from 'react-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Botao } from '../../componentes/Botao'
import { CampoSelecao } from '../../componentes/CampoSelecao'
import { useTecnicos } from '../../hooks/useTecnicos'
import { SeletorUrgencia } from '../../componentes/SeletorUrgencia'
import type { SolicitacaoOS } from '../../tipos/ordemServico'
import {
  esquemaAbrirOrdemServico,
  type DadosAbrirOrdemServico,
} from './esquemaAbrirOrdemServico'
import { useSaidaAnimada } from '../../hooks/useSaidaAnimada'
import { useDialogo } from '../../hooks/useDialogo'

interface ModalAbrirOrdemServicoProps {
  solicitacao: SolicitacaoOS
  aoFechar: () => void
  // Promise: o modal espera o servidor e só fecha se deu certo.
  aoSalvar: (dados: DadosAbrirOrdemServico) => Promise<void>
}

export function ModalAbrirOrdemServico({
  solicitacao,
  aoFechar,
  aoSalvar,
}: ModalAbrirOrdemServicoProps) {
  const { fechar, classeFundo, classeCartao } = useSaidaAnimada(aoFechar)

  const { data: tecnicos = [] } = useTecnicos(solicitacao.lojaId)
  const agora = new Date()

  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<DadosAbrirOrdemServico>({
    resolver: zodResolver(esquemaAbrirOrdemServico),
    defaultValues: {
      urgencia: undefined,
      tecnicoId: 0,
    },
  })

  async function aoSalvarFormulario(dados: DadosAbrirOrdemServico) {
    try {
      await aoSalvar(dados)
    } catch {
      // O toast do api.ts já disse o que deu errado. O modal fica aberto com o que foi
      // digitado, para tentar de novo -- fechar antes da resposta perdia tudo.
      return
    }
    fechar()
  }

  const { propsDialogo, idTitulo } = useDialogo(fechar, { podeFechar: !isSubmitting })

  return createPortal(
    <div
      className={`${classeFundo} fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm`}
    >
      <div
        {...propsDialogo}
        className={`${classeCartao} shadow-pop w-full max-w-md overflow-hidden rounded-2xl bg-white`}
      >
        <div className="bg-marca-600 flex items-start justify-between px-6 py-4">
          <div>
            <p className="font-mono text-xs font-bold tracking-widest text-white/80 uppercase">
              Painel do Gestor
            </p>
            <p id={idTitulo} className="font-display text-lg font-bold text-white">
              Abrir OS · #{solicitacao.id}
            </p>
            <p className="text-xs text-white/80">{solicitacao.maquinaNome}</p>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={fechar}
            disabled={isSubmitting}
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
          className="flex max-h-[75vh] flex-col gap-5 overflow-y-auto p-6"
        >
          <Controller
            control={control}
            name="urgencia"
            render={({ field }) => (
              <SeletorUrgencia
                valor={field.value}
                aoSelecionar={field.onChange}
                mensagemErro={errors.urgencia?.message}
              />
            )}
          />

          <div className="flex flex-col gap-1">
            <span className="text-marca-500 font-mono text-xs font-semibold tracking-wide uppercase">
              Data/Hora
            </span>
            <p className="text-marca-800 rounded-xl border border-slate-200/60 bg-slate-50 px-4 py-2.5 font-mono text-sm text-slate-700">
              {agora.toLocaleString('pt-BR')}
            </p>
          </div>

          <Controller
            control={control}
            name="tecnicoId"
            render={({ field }) => (
              <CampoSelecao
                rotulo="Técnico Responsável *"
                mensagemErro={errors.tecnicoId?.message}
                value={field.value || ''}
                onChange={(evento) =>
                  field.onChange(Number(evento.target.value))
                }
              >
                <option value="">Selecionar técnico...</option>
                {tecnicos.map((tecnico) => (
                  <option key={tecnico.id} value={tecnico.id}>
                    {tecnico.nome} — {tecnico.area}
                  </option>
                ))}
              </CampoSelecao>
            )}
          />

          <div className="mt-1 flex gap-3">
            <div className="flex-1">
              <Botao type="button" variante="secundario" onClick={fechar} disabled={isSubmitting}>
                Cancelar
              </Botao>
            </div>
            <div className="flex-1">
              <Botao
                type="submit"
                carregando={isSubmitting}
                rotuloCarregando="Abrindo..."
                className="flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                Abrir OS
              </Botao>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
