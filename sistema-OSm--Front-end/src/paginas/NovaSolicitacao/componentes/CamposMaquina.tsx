import { useFormContext, useWatch } from 'react-hook-form'
import { CampoSelecao } from '../../../componentes/CampoSelecao'
import { PreviaMaquina } from '../../../componentes/PreviaMaquina'
import type { Maquina } from '../../../tipos/maquina'
import type { DadosNovaSolicitacao } from '../esquemaNovaSolicitacao'

interface CamposMaquinaProps {
  maquinas: Maquina[]
  carregando: boolean
}

// Seleção da máquina + prévia da foto de cadastro, usada pelo tipo Maquinário. A
// lista já chega restrita ao setor/loja do Solicitante (o servidor aplica a restrição).
export function CamposMaquina({ maquinas, carregando }: CamposMaquinaProps) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<DadosNovaSolicitacao>()

  const maquinaId = useWatch({ control, name: 'maquinaId' })
  const maquinaSelecionada = maquinas.find(
    (maquina) => maquina.id === maquinaId,
  )

  return (
    <div className="flex flex-col gap-3">
      <CampoSelecao
        rotulo="Máquina"
        mensagemErro={errors.maquinaId?.message}
        disabled={carregando || maquinas.length === 0}
        {...register('maquinaId', {
          // A opção vazia precisa virar `undefined` (e não NaN, como faria valueAsNumber)
          // para o esquema responder "Selecione uma máquina." em vez do erro genérico.
          setValueAs: (valor) => (valor === '' ? undefined : Number(valor)),
        })}
      >
        <option value="">
          {carregando
            ? 'Carregando...'
            : maquinas.length === 0
              ? 'Nenhuma máquina cadastrada no seu setor.'
              : 'Selecione uma máquina...'}
        </option>
        {maquinas.map((maquina) => (
          <option key={maquina.id} value={maquina.id}>
            {/* Patrimônio, não o id do banco: é o número da etiqueta física da
                máquina -- com várias "Forno" no mesmo setor, é o único jeito de
                o Solicitante saber qual delas está escolhendo. Mesmo padrão de
                AdministradorMaquinas. Cai pro id só se a máquina não tiver
                patrimônio cadastrado. */}
            {maquina.nome} · {maquina.numeroPatrimonio || maquina.id}
          </option>
        ))}
      </CampoSelecao>

      <PreviaMaquina maquina={maquinaSelecionada} />
    </div>
  )
}
