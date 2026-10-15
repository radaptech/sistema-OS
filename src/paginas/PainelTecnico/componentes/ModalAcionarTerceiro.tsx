import { createPortal } from 'react-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Truck, XCircle } from 'lucide-react'
import { Botao } from '../../../componentes/Botao'
import { CampoSelecao } from '../../../componentes/CampoSelecao'
import { MiniaturaFoto } from '../../../componentes/MiniaturaFoto'
import { useEmpresasTerceirizadas } from '../../../hooks/useEmpresasTerceirizadas'
import { obterNomeAlvo } from '../../../utilitarios/alvoOS'
import type { OrdemServico } from '../../../tipos/ordemServico'
import {
  esquemaAcionarTerceiro,
  type DadosAcionarTerceiro,
} from '../esquemaAcionarTerceiro'
import { useSaidaAnimada } from '../../../hooks/useSaidaAnimada'

interface ModalAcionarTerceiroProps {
  ordemServico: OrdemServico
  aoFechar: () => void
  aoSalvar: (dados: DadosAcionarTerceiro) => void
}

export function ModalAcionarTerceiro({
  ordemServico,
  aoFechar,
  aoSalvar,
}: ModalAcionarTerceiroProps) {
  const { fechar, classeFundo, classeCartao } = useSaidaAnimada(aoFechar)

  const { data: empresas = [], isLoading } = useEmpresasTerceirizadas()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<DadosAcionarTerceiro>({
    resolver: zodResolver(esquemaAcionarTerceiro),
    defaultValues: {
      empresaTerceirizadaId: ordemServico.empresaTerceirizadaId,
    },
  })

  // Prévia da escolhida (foto, especialidade, telefone): o select só cabe o nome, e é
  // pela foto/logo que o Técnico confere que pegou a empresa certa.
  const empresaEscolhidaId = useWatch({ control, name: 'empresaTerceirizadaId' })
  const empresaEscolhida = empresas.find((empresa) => empresa.id === empresaEscolhidaId)

  function aoSalvarFormulario(dados: DadosAcionarTerceiro) {
    aoSalvar(dados)
    fechar()
  }

  return createPortal(
    <div className={`${classeFundo} fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm`}>
      <div className={`${classeCartao} shadow-pop w-full max-w-md overflow-hidden rounded-2xl bg-white`}>
        <div className="flex items-start justify-between bg-blue-600 px-6 py-4">
          <div>
            <p className="font-mono text-xs font-bold tracking-widest text-white/80 uppercase">
              Painel do Técnico
            </p>
            <p className="font-display text-lg font-bold text-white">
              Acionar Terceiro · OS #{ordemServico.id}
            </p>
            <p className="text-xs text-white/80">
              {obterNomeAlvo(ordemServico)}
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
          <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
            A OS continua sua — os dois relógios seguem correndo e você é quem
            encerra quando a empresa terminar o serviço. Se o atendimento vai
            demorar, use <span className="font-semibold">Pausar</span> para não
            contar essa espera como hora trabalhada.
          </p>

          <CampoSelecao
            rotulo="Empresa Terceirizada *"
            mensagemErro={errors.empresaTerceirizadaId?.message}
            disabled={isLoading || empresas.length === 0}
            {...register('empresaTerceirizadaId', {
              setValueAs: (valor) => (valor === '' ? undefined : Number(valor)),
            })}
          >
            <option value="">
              {isLoading
                ? 'Carregando...'
                : empresas.length === 0
                  ? 'Nenhuma empresa terceirizada cadastrada.'
                  : 'Selecione a empresa...'}
            </option>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nome}
                {empresa.especialidade ? ` — ${empresa.especialidade}` : ''}
              </option>
            ))}
          </CampoSelecao>

          {empresaEscolhida && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-slate-50 p-3">
              <MiniaturaFoto
                fotoUrl={empresaEscolhida.fotoUrl}
                alt={empresaEscolhida.nome}
                Icone={Building2}
                className="h-14 w-14 rounded-lg"
                tamanhoIcone={20}
              />
              <div className="min-w-0 text-sm">
                <p className="truncate font-semibold text-slate-800">{empresaEscolhida.nome}</p>
                {empresaEscolhida.especialidade && (
                  <p className="truncate text-xs text-slate-500">{empresaEscolhida.especialidade}</p>
                )}
                {empresaEscolhida.telefone && (
                  <p className="font-mono text-xs text-slate-500">{empresaEscolhida.telefone}</p>
                )}
              </div>
            </div>
          )}

          <div className="mt-1 flex gap-3">
            <div className="flex-1">
              <Botao type="button" variante="secundario" onClick={fechar}>
                Cancelar
              </Botao>
            </div>
            <div className="flex-1">
              <Botao
                type="submit"
                className="flex items-center justify-center gap-2 bg-blue-600"
              >
                <Truck size={16} />
                Acionar
              </Botao>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
