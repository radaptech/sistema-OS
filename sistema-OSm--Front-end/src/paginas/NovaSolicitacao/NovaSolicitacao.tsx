import { useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Botao } from '../../componentes/Botao'
import { CampoTexto } from '../../componentes/CampoTexto'
import { CampoTextoArea } from '../../componentes/CampoTextoArea'
import { CabecalhoPagina } from '../../componentes/CabecalhoPagina'
import { UploadFoto } from '../../componentes/UploadFoto'
import { UploadVideo } from '../../componentes/UploadVideo'
import { useMaquinas } from '../../hooks/useMaquinas'
import { useEstadoAutenticacao } from '../../estado/estadoAutenticacao'
import {
  servicoSolicitacoes,
  type EnvioNovaSolicitacao,
} from '../../servicos/servicoSolicitacoes'
import { formatarDataHora } from '../../utilitarios/formatarData'
import { agoraParaBackend } from '../../utilitarios/dataBackend'
import {
  tiposSolicitacao,
  type TipoSolicitacao,
} from '../../tipos/ordemServico'
import {
  esquemaNovaSolicitacao,
  LIMITES_DESCRICAO,
  type DadosNovaSolicitacao,
} from './esquemaNovaSolicitacao'
import { SeletorTipoSolicitacao } from './componentes/SeletorTipoSolicitacao'
import { CamposMaquina } from './componentes/CamposMaquina'
import { CamposImpacto } from './componentes/CamposImpacto'

// Identidade visual de cada tipo na faixa do cartão — o botão primário segue a cor da
// marca em todas as telas, conforme o design system.
const APARENCIA_POR_TIPO: Record<TipoSolicitacao, { faixa: string; cor: string }> = {
  maquinario: {
    faixa: 'Nova Ordem de Serviço · Maquinário',
    cor: 'bg-marca-600',
  },
  reparo: {
    faixa: 'Nova Ordem de Serviço · Pequenos Reparos',
    cor: 'bg-orange-600',
  },
}

const PLACEHOLDER_DESCRICAO: Record<TipoSolicitacao, string> = {
  maquinario: 'Descreva o problema da máquina...',
  reparo: 'Ex: Lâmpada de LED do corredor queimou.',
}

function valoresIniciais(tipo: TipoSolicitacao): DadosNovaSolicitacao {
  return {
    tipo,
    maquinaId: undefined,
    item: '',
    descricao: '',
    impactos: [],
  }
}

// Aceita ?tipo= vindo das rotas antigas (/nova-solicitacao-os e companhia), que hoje
// redirecionam para cá em vez de quebrar links já salvos pelos Solicitantes.
function lerTipoDaUrl(valor: string | null): TipoSolicitacao {
  return tiposSolicitacao.find((tipo) => tipo === valor) ?? 'maquinario'
}

// O formulário é plano para o React Hook Form; o envio é discriminado por tipo. O esquema
// já garantiu a presença dos campos obrigatórios de cada tipo antes de chegar aqui.
function montarEnvio(dados: DadosNovaSolicitacao): EnvioNovaSolicitacao {
  if (dados.tipo === 'reparo') {
    return {
      tipo: 'reparo',
      item: dados.item as string,
      descricao: dados.descricao,
    }
  }

  return {
    tipo: 'maquinario',
    maquinaId: dados.maquinaId as number,
    descricao: dados.descricao,
    impactos: dados.impactos,
  }
}

export function NovaSolicitacao() {
  const navegar = useNavigate()
  const [parametrosBusca] = useSearchParams()
  const nomeUsuario = useEstadoAutenticacao((estado) => estado.nomeUsuario)
  const setorIdUsuario = useEstadoAutenticacao((estado) => estado.setorId)
  const setorNomeUsuario = useEstadoAutenticacao((estado) => estado.setorNome)
  const lojaIdUsuario = useEstadoAutenticacao((estado) => estado.lojaId)

  const { data: maquinas = [], isLoading: carregandoMaquinas } = useMaquinas({
    setorId: setorIdUsuario ?? undefined,
    lojaId: lojaIdUsuario ?? undefined,
  })

  // Exibido como confirmação; o instante gravado é o do servidor.
  const [dataHora] = useState(() => agoraParaBackend())
  const [foto, setFoto] = useState<File | null>(null)
  const [video, setVideo] = useState<File | null>(null)

  const formulario = useForm<DadosNovaSolicitacao>({
    resolver: zodResolver(esquemaNovaSolicitacao),
    defaultValues: valoresIniciais(lerTipoDaUrl(parametrosBusca.get('tipo'))),
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = formulario

  const tipo = useWatch({ control, name: 'tipo' })
  const descricao = useWatch({ control, name: 'descricao' }) ?? ''
  const maquinaId = useWatch({ control, name: 'maquinaId' })
  const maquinaSelecionada = maquinas.find(
    (maquina) => maquina.id === maquinaId,
  )

  const ehReparo = tipo === 'reparo'
  const limites = LIMITES_DESCRICAO[tipo]
  const aparencia = APARENCIA_POR_TIPO[tipo]

  // Minhas Solicitações e os números da Home precisam mostrar o pedido recém-enviado.
  const queryClient = useQueryClient()
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (dados: DadosNovaSolicitacao) =>
      servicoSolicitacoes.criarPorTipo(
        montarEnvio(dados),
        foto as File,
        video ?? undefined,
      ),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['solicitacoes-os'] }),
        queryClient.invalidateQueries({ queryKey: ['solicitacoes-resumo'] }),
      ]),
  })

  // Trocar o tipo limpa o que não se aplica ao novo formulário, mas preserva o que o
  // Solicitante já escreveu — só corta a descrição quando o novo limite é menor.
  function trocarTipo(novoTipo: TipoSolicitacao) {
    const atual = formulario.getValues()

    reset({
      ...valoresIniciais(novoTipo),
      descricao: atual.descricao.slice(0, LIMITES_DESCRICAO[novoTipo].maximo),
    })

    if (novoTipo === 'reparo') {
      setVideo(null)
    }
  }

  async function aoEnviar(dados: DadosNovaSolicitacao) {
    if (!foto) {
      toast.error('Anexe uma foto antes de enviar a solicitação.')
      return
    }

    await mutateAsync(dados)
    toast.success('Solicitação enviada com sucesso.')
    reset(valoresIniciais(dados.tipo))
    setFoto(null)
    setVideo(null)
    navegar('/home-solicitante')
  }

  return (
    <div className="flex min-h-svh flex-col bg-slate-50">
      <CabecalhoPagina titulo="Nova Solicitação" />

      <main className="flex flex-1 justify-center px-4 py-8">
        <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-sm">
          <div
            className={`relative isolate overflow-hidden py-3 text-center transition-colors duration-300 ${aparencia.cor}`}
          >
            <div className="bg-grade-industrial bg-grade pointer-events-none absolute inset-0 opacity-20" />
            <p className="font-display relative text-sm font-bold tracking-widest text-white uppercase">
              {aparencia.faixa}
            </p>
          </div>

          <FormProvider {...formulario}>
            <form
              onSubmit={handleSubmit(aoEnviar)}
              noValidate
              className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8"
            >
              <div className="sm:col-span-2">
                <SeletorTipoSolicitacao
                  valor={tipo}
                  aoSelecionar={trocarTipo}
                />
              </div>

              {ehReparo ? (
                <CampoTexto
                  rotulo="Item *"
                  placeholder="Ex: Lâmpada de LED"
                  mensagemErro={errors.item?.message}
                  {...register('item')}
                />
              ) : (
                <CamposMaquina
                  maquinas={maquinas}
                  carregando={carregandoMaquinas}
                />
              )}

              <CampoTexto
                rotulo="Solicitante"
                readOnly
                value={nomeUsuario ?? ''}
              />

              <CampoTexto
                rotulo={ehReparo ? 'Setor' : 'Setor da Máquina'}
                readOnly
                placeholder={ehReparo ? '' : 'Selecione uma máquina...'}
                value={
                  (ehReparo
                    ? setorNomeUsuario
                    : maquinaSelecionada?.setorNome) ?? ''
                }
              />

              <div className="flex flex-col gap-1">
                <span className="text-marca-500 font-mono text-xs font-semibold tracking-wider uppercase">
                  Data/Hora
                </span>
                <p className="rounded-xl border border-slate-200/60 bg-slate-50 px-4 py-2.5 text-slate-700 font-mono text-sm">
                  {formatarDataHora(dataHora)}
                </p>
              </div>

              <div className="sm:col-span-2">
                <CampoTextoArea
                  rotulo={ehReparo ? 'Descrição' : 'Descrição do Problema'}
                  rows={ehReparo ? 4 : 5}
                  maxLength={limites.maximo}
                  placeholder={PLACEHOLDER_DESCRICAO[tipo]}
                  mensagemErro={errors.descricao?.message}
                  {...register('descricao')}
                />
                <p className="mt-1 text-right text-xs text-slate-400">
                  {descricao.length}/{limites.maximo}
                </p>
              </div>

              <UploadFoto
                foto={foto}
                aoSelecionarFoto={setFoto}
                rotulo={ehReparo ? 'Foto do Item *' : 'Foto do Defeito *'}
                textoAlternativo={
                  ehReparo
                    ? 'Foto do item que precisa de reparo'
                    : 'Foto do defeito constatado na máquina'
                }
              />

              {!ehReparo && (
                <UploadVideo
                  video={video}
                  aoSelecionarVideo={setVideo}
                  rotulo="Vídeo do Defeito (opcional)"
                />
              )}

              {tipo === 'maquinario' && (
                <div className="sm:col-span-2">
                  <CamposImpacto />
                </div>
              )}

              <div className="sm:col-span-2">
                <Botao type="submit" disabled={isPending}>
                  {isPending ? 'Enviando...' : 'Enviar Solicitação'}
                </Botao>
              </div>
            </form>
          </FormProvider>
        </div>
      </main>

      <footer className="py-4 text-center">
        <span className="font-mono text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
          Solicitação OS © {new Date().getFullYear()}
        </span>
      </footer>
    </div>
  )
}
