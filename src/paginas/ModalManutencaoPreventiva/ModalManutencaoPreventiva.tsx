import { createPortal } from 'react-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Botao } from '../../componentes/Botao'
import { CampoTexto } from '../../componentes/CampoTexto'
import { CampoSelecao } from '../../componentes/CampoSelecao'
import { CampoTextoArea } from '../../componentes/CampoTextoArea'
import { Alternador } from '../../componentes/Alternador'
import { useTecnicos } from '../../hooks/useTecnicos'
import type { PreventivaManutencao } from '../../tipos/maquina'
import {
  esquemaManutencaoPreventiva,
  type DadosManutencaoPreventiva,
} from './esquemaManutencaoPreventiva'
import { useSaidaAnimada } from '../../hooks/useSaidaAnimada'
import { useDialogo } from '../../hooks/useDialogo'

interface ModalManutencaoPreventivaProps {
  aoFechar: () => void
  aoSalvar: (preventiva: PreventivaManutencao) => void
  maquinaFixa: { id: number; nome: string }
  // Loja da máquina, para restringir o select de técnico a quem atende ela — mesmo
  // critério do "Técnico Responsável" na abertura de OS pelo Gestor.
  lojaId: number
}

export function ModalManutencaoPreventiva({
  aoFechar,
  aoSalvar,
  maquinaFixa,
  lojaId,
}: ModalManutencaoPreventivaProps) {
  const { fechar, classeFundo, classeCartao } = useSaidaAnimada(aoFechar)
  const { data: tecnicos, isPending: carregandoTecnicos } = useTecnicos(lojaId || undefined)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<DadosManutencaoPreventiva>({
    resolver: zodResolver(esquemaManutencaoPreventiva),
    defaultValues: {
      maquinaId: maquinaFixa.id,
      tecnicoId: undefined,
      descricao: '',
      intervaloDias: undefined,
      proximaData: '',
      ativa: true,
    },
  })

  function aoSalvarFormulario(dados: DadosManutencaoPreventiva) {
    aoSalvar(dados)
    fechar()
  }

  const { propsDialogo, idTitulo } = useDialogo(fechar)

  return createPortal(
    <div className={`${classeFundo} fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm`}>
      <div {...propsDialogo} className={`${classeCartao} w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-pop`}>
        <div className="flex items-start justify-between bg-marca-600 px-6 py-4">
          <div>
            {/* Só o cadastro de máquina abre este modal, e cadastro é do Administrador. */}
            <p className="font-mono text-xs font-bold tracking-widest text-white/80 uppercase">
              Painel do Administrador
            </p>
            <p id={idTitulo} className="font-display text-lg font-bold text-white">
              Nova Manutenção Preventiva
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

        <form
          onSubmit={(evento) => {
            evento.stopPropagation()
            handleSubmit(aoSalvarFormulario)(evento)
          }}
          noValidate
          className="flex flex-col gap-5 p-6"
        >
          <CampoSelecao
            rotulo="Máquina *"
            disabled
            mensagemErro={errors.maquinaId?.message}
            {...register('maquinaId')}
          >
            <option value={maquinaFixa.id}>{maquinaFixa.nome}</option>
          </CampoSelecao>

          {/* setValueAs e não valueAsNumber: a opção vazia viraria NaN, e o Zod
              responderia a mensagem de tipo em vez de "selecione o técnico". */}
          <CampoSelecao
            rotulo="Técnico Responsável *"
            mensagemErro={errors.tecnicoId?.message}
            {...register('tecnicoId', {
              setValueAs: (valor) => (valor === '' ? undefined : Number(valor)),
            })}
          >
            <option value="">
              {carregandoTecnicos ? 'Carregando técnicos...' : 'Selecione o técnico'}
            </option>
            {tecnicos?.map((tecnico) => (
              <option key={tecnico.id} value={tecnico.id}>
                {tecnico.nome} — {tecnico.area}
              </option>
            ))}
          </CampoSelecao>

          <p className="-mt-2 text-xs text-slate-500">
            Quando esta preventiva vencer, a OS é aberta automaticamente no nome deste
            técnico — ela não passa pela aprovação do Gestor.
          </p>

          <CampoTextoArea
            rotulo="Descrição *"
            rows={3}
            placeholder="Descreva o procedimento de manutenção..."
            mensagemErro={errors.descricao?.message}
            {...register('descricao')}
          />

          <div className="grid grid-cols-2 gap-4">
            <CampoTexto
              rotulo="Intervalo (dias) *"
              type="number"
              min={1}
              placeholder="Ex: 30"
              mensagemErro={errors.intervaloDias?.message}
              {...register('intervaloDias', { valueAsNumber: true })}
            />
            <CampoTexto
              rotulo="Próxima Data *"
              type="date"
              mensagemErro={errors.proximaData?.message}
              {...register('proximaData')}
            />
          </div>

          <Controller
            control={control}
            name="ativa"
            render={({ field }) => (
              <Alternador
                id={field.name}
                rotulo="Ativa"
                descricao="Preventiva habilitada no sistema"
                marcado={field.value}
                aoAlternar={field.onChange}
              />
            )}
          />

          <div className="mt-1 flex gap-3">
            <div className="flex-1">
              <Botao type="button" variante="secundario" onClick={fechar}>
                Cancelar
              </Botao>
            </div>
            <div className="flex-1">
              <Botao type="submit" className="flex items-center justify-center gap-2">
                <CheckCircle2 size={16} />
                Salvar
              </Botao>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
