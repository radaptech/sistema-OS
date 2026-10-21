import { Controller, useFormContext } from 'react-hook-form'
import { marcadoresImpacto } from '../../../tipos/ordemServico'
import type { DadosNovaSolicitacao } from '../esquemaNovaSolicitacao'

// Marcador único e opcional, preenchido pelo próprio Solicitante e exibido ao Gestor no
// ModalDetalhesSolicitacao. Não é só informativo: é ele que liga o relógio de máquina
// parada da OS no Painel do Técnico — por isso a consequência fica escrita na tela, e não
// só na documentação.
export function CamposImpacto() {
  const { control } = useFormContext<DadosNovaSolicitacao>()

  return (
    <div className="flex flex-col gap-2">
      <span className="text-marca-500 font-mono text-xs font-semibold tracking-wider uppercase">
        Impacto na Produção
      </span>

      <Controller
        control={control}
        name="impactos"
        render={({ field }) => (
          <div className="flex flex-wrap gap-2">
            {marcadoresImpacto.map((marcador) => {
              const marcado = field.value.includes(marcador)

              return (
                <label
                  key={marcador}
                  className={`flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 font-mono text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                    marcado
                      ? 'bg-marca-600 text-white shadow-sm shadow-marca-600/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={() =>
                      field.onChange(
                        marcado
                          ? field.value.filter((item) => item !== marcador)
                          : [...field.value, marcador],
                      )
                    }
                    className="sr-only"
                  />
                  {marcador}
                </label>
              )
            })}
          </div>
        )}
      />

      <p className="text-xs text-slate-400">
        Marque apenas se a máquina{' '}
        <strong className="font-semibold">parou</strong>: é isso que faz a OS
        contar tempo de máquina parada. Sem o marcador, entende-se que a máquina
        seguiu operando.
      </p>
    </div>
  )
}
