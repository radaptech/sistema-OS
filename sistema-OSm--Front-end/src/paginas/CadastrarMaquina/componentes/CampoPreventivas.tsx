import { CalendarClock, Plus, Trash2 } from 'lucide-react'
import { useFieldArray, type Control, type FieldErrors } from 'react-hook-form'
import { useEstadoModais } from '../../../estado/estadoModais'
import { useTecnicos } from '../../../hooks/useTecnicos'
import { ModalManutencaoPreventiva } from '../../ModalManutencaoPreventiva/ModalManutencaoPreventiva'
import { converterDataFormularioParaBackend } from '../../../utilitarios/dataBackend'
import type { DadosCadastrarMaquina } from '../esquemaCadastrarMaquina'

// A máquina ainda não existe no banco quando as preventivas são montadas: o vínculo é
// feito no servidor, que cria as duas coisas na mesma transação.
const ID_MAQUINA_EM_CADASTRO = 0

interface CampoPreventivasProps {
  control: Control<DadosCadastrarMaquina>
  errors: FieldErrors<DadosCadastrarMaquina>
  nomeMaquina: string
  // Repassado ao modal para restringir o select de técnico à loja da máquina.
  lojaId: number
}

export function CampoPreventivas({ control, errors, nomeMaquina, lojaId }: CampoPreventivasProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'preventivas' })
  const { modalAtivo, abrirModal, fecharModal } = useEstadoModais()
  // Mesma chave de cache do modal: o React Query serve as duas chamadas com uma
  // requisição só. O card mostra o nome porque o técnico deixou de ser detalhe — é
  // ele quem recebe a OS quando a preventiva vencer.
  const { data: tecnicos } = useTecnicos(lojaId || undefined)

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 pt-5">
      <div className="flex items-center justify-between">
        <label className="font-mono text-xs font-semibold tracking-wider text-marca-500 uppercase">
          Manutenções Preventivas *
        </label>
        {/* Sem loja escolhida o select de técnico do modal viria vazio, e o cadastro
            travaria num campo obrigatório sem opção nenhuma. */}
        <button
          type="button"
          disabled={lojaId <= 0}
          onClick={() => abrirModal('manutencaoPreventiva')}
          className="flex items-center gap-1 text-xs font-semibold text-marca-800 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
        >
          <Plus size={14} />
          Adicionar
        </button>
      </div>

      {fields.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-4 text-center text-xs text-slate-400">
          {lojaId > 0
            ? 'Nenhuma preventiva cadastrada. Adicione ao menos uma para continuar.'
            : 'Escolha a loja acima para poder adicionar as preventivas.'}
        </p>
      )}

      {fields.map((field, indice) => (
        <div
          key={field.id}
          className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-marca-600 text-white">
              <CalendarClock size={16} />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-700">{field.descricao}</p>
              <p className="text-xs text-slate-400">
                A cada {field.intervaloDias} dia(s) · Próxima: {converterDataFormularioParaBackend(field.proximaData)}
              </p>
              <p className="text-xs text-slate-400">
                Técnico:{' '}
                {tecnicos?.find((tecnico) => tecnico.id === field.tecnicoId)?.nome ??
                  'não definido'}
              </p>
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  field.ativa
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {field.ativa ? 'Ativa' : 'Inativa'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => remove(indice)}
            aria-label="Remover preventiva"
            className="text-red-400 transition hover:text-red-600"
          >
            <Trash2 size={18} />
          </button>
        </div>
      ))}

      {errors.preventivas?.root?.message && (
        <span className="text-xs text-red-500">{errors.preventivas.root.message}</span>
      )}

      {modalAtivo === 'manutencaoPreventiva' && (
        <ModalManutencaoPreventiva
          aoFechar={fecharModal}
          aoSalvar={(preventiva) => append(preventiva)}
          maquinaFixa={{
            id: ID_MAQUINA_EM_CADASTRO,
            nome: nomeMaquina || 'Esta máquina (novo cadastro)',
          }}
          lojaId={lojaId}
        />
      )}
    </div>
  )
}
