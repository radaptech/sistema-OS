import { useEffect } from 'react'
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { ClipboardPlus } from 'lucide-react'
import { Botao } from '../../componentes/Botao'
import { CabecalhoSubpagina } from '../../componentes/CabecalhoSubpagina'
import { CampoSelecao } from '../../componentes/CampoSelecao'
import { CampoTexto } from '../../componentes/CampoTexto'
import { CampoTextoArea } from '../../componentes/CampoTextoArea'
import { SeletorUrgencia } from '../../componentes/SeletorUrgencia'
import { useEstadoAutenticacao } from '../../estado/estadoAutenticacao'
import { useLojas } from '../../hooks/useLojas'
import { useMaquinas } from '../../hooks/useMaquinas'
import { useSetores } from '../../hooks/useSetores'
import { useTecnicos } from '../../hooks/useTecnicos'
import { ROTA_POR_PERFIL } from '../../rotas/rotaPorPerfil'
import { servicoSolicitacoes } from '../../servicos/servicoSolicitacoes'
import type { IdUrgencia, TipoSolicitacao } from '../../tipos/ordemServico'
import { gestorTemAcesso } from '../../utilitarios/acessoGestor'
import { CamposImpacto } from '../NovaSolicitacao/componentes/CamposImpacto'
import { CamposMaquina } from '../NovaSolicitacao/componentes/CamposMaquina'
import { SeletorTipoSolicitacao } from '../NovaSolicitacao/componentes/SeletorTipoSolicitacao'
import { LIMITES_DESCRICAO } from '../NovaSolicitacao/esquemaNovaSolicitacao'
import {
  esquemaAbrirOSDireta,
  type DadosAbrirOSDireta,
} from './esquemaAbrirOSDireta'

function valoresIniciais(tipo: TipoSolicitacao): DadosAbrirOSDireta {
  return {
    tipo,
    maquinaId: undefined,
    item: '',
    setorId: undefined,
    descricao: '',
    impactos: [],
    urgencia: undefined,
    tecnicoId: 0,
  }
}

// OS aberta pelo Gestor (ou Administrador) sem passar pela fila — para quando o
// Solicitante não está disponível. Mesmos campos da Nova Solicitação, sem foto, mais
// urgência e técnico: a solicitação e a OS nascem juntas no servidor.
export function AbrirOSDireta() {
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const perfil = useEstadoAutenticacao((estado) => estado.perfil)
  const escoposGestor = useEstadoAutenticacao((estado) => estado.escoposGestor)

  // Máquinas já chegam recortadas pelo escopo no servidor; setores não (GET /setores é
  // o cadastro inteiro), então o select do Gestor filtra aqui — o servidor recusa o
  // setor fora do escopo de qualquer forma.
  const { data: maquinas = [], isLoading: carregandoMaquinas } = useMaquinas()
  const { data: todosSetores = [] } = useSetores()
  const { data: lojas = [] } = useLojas()
  const setores = todosSetores.filter(
    (setor) =>
      setor.ativo !== false &&
      (perfil !== 'gestor' ||
        gestorTemAcesso(escoposGestor ?? [], setor.lojaId, setor.id)),
  )

  const formulario = useForm<DadosAbrirOSDireta>({
    resolver: zodResolver(esquemaAbrirOSDireta),
    defaultValues: valoresIniciais('maquinario'),
  })
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = formulario

  const tipo = useWatch({ control, name: 'tipo' })
  const descricao = useWatch({ control, name: 'descricao' }) ?? ''
  const maquinaId = useWatch({ control, name: 'maquinaId' })
  const setorId = useWatch({ control, name: 'setorId' })
  const ehReparo = tipo === 'reparo'
  const limites = LIMITES_DESCRICAO[tipo]

  // O técnico tem que atender a loja da OS: a lista só abre depois de saber a loja.
  const lojaId = ehReparo
    ? setores.find((setor) => setor.id === setorId)?.lojaId
    : maquinas.find((maquina) => maquina.id === maquinaId)?.lojaId
  const { data: tecnicos = [], isLoading: carregandoTecnicos } =
    useTecnicos(lojaId)

  // Trocou a loja, o técnico escolhido pode não atendê-la mais.
  useEffect(() => {
    setValue('tecnicoId', 0)
  }, [lojaId, setValue])

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (dados: DadosAbrirOSDireta) =>
      servicoSolicitacoes.criarDireta({
        ...(dados.tipo === 'reparo'
          ? { ...dados, maquinaId: undefined, impactos: [] }
          : { ...dados, item: undefined, setorId: undefined }),
        // O superRefine já barrou o envio sem urgência.
        urgencia: dados.urgencia as IdUrgencia,
      }),
  })

  function trocarTipo(novoTipo: TipoSolicitacao) {
    const atual = formulario.getValues()
    reset({
      ...valoresIniciais(novoTipo),
      descricao: atual.descricao.slice(0, LIMITES_DESCRICAO[novoTipo].maximo),
      urgencia: atual.urgencia,
    })
  }

  async function aoEnviar(dados: DadosAbrirOSDireta) {
    const ordem = await mutateAsync(dados)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-os-todas'] }),
      queryClient.invalidateQueries({ queryKey: ['ordens-servico-todas'] }),
    ])
    toast.success(`OS #${ordem.id} aberta com sucesso.`)
    navegar(ROTA_POR_PERFIL[perfil ?? 'gestor'])
  }

  const nomeLoja = (id: number) =>
    lojas.find((loja) => loja.id === id)?.nome ?? ''

  return (
    <div className="flex min-h-svh flex-col bg-slate-50">
      <CabecalhoSubpagina
        contexto={
          perfil === 'administrador'
            ? 'Painel do Administrador'
            : 'Painel do Gestor'
        }
        titulo="Abrir OS direta"
        Icone={ClipboardPlus}
      />

      <main className="flex flex-1 justify-center px-4 py-8">
        <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-sm">
          <FormProvider {...formulario}>
            <form
              onSubmit={handleSubmit(aoEnviar)}
              noValidate
              className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8"
            >
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 sm:col-span-2">
                Para quando o solicitante não está disponível: a OS já sai
                aberta para o técnico, sem passar pela fila e sem foto.
              </p>

              <div className="sm:col-span-2">
                <SeletorTipoSolicitacao
                  valor={tipo}
                  aoSelecionar={trocarTipo}
                />
              </div>

              {ehReparo ? (
                <>
                  <CampoTexto
                    rotulo="Item *"
                    placeholder="Ex: Lâmpada de LED"
                    mensagemErro={errors.item?.message}
                    {...register('item')}
                  />
                  <CampoSelecao
                    rotulo="Setor *"
                    mensagemErro={errors.setorId?.message}
                    {...register('setorId', {
                      setValueAs: (valor) =>
                        valor === '' ? undefined : Number(valor),
                    })}
                  >
                    <option value="">Selecione o setor...</option>
                    {setores.map((setor) => (
                      <option key={setor.id} value={setor.id}>
                        {nomeLoja(setor.lojaId)} · {setor.nome}
                      </option>
                    ))}
                  </CampoSelecao>
                </>
              ) : (
                <div className="sm:col-span-2">
                  <CamposMaquina
                    maquinas={maquinas}
                    carregando={carregandoMaquinas}
                  />
                </div>
              )}

              <div className="sm:col-span-2">
                <CampoTextoArea
                  rotulo={ehReparo ? 'Descrição' : 'Descrição do Problema'}
                  rows={ehReparo ? 4 : 5}
                  maxLength={limites.maximo}
                  mensagemErro={errors.descricao?.message}
                  {...register('descricao')}
                />
                <p className="mt-1 text-right text-xs text-slate-400">
                  {descricao.length}/{limites.maximo}
                </p>
              </div>

              {!ehReparo && (
                <div className="sm:col-span-2">
                  <CamposImpacto />
                </div>
              )}

              <div className="sm:col-span-2">
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
              </div>

              <div className="sm:col-span-2">
                <Controller
                  control={control}
                  name="tecnicoId"
                  render={({ field }) => (
                    <CampoSelecao
                      rotulo="Técnico Responsável *"
                      mensagemErro={errors.tecnicoId?.message}
                      disabled={!lojaId}
                      value={field.value || ''}
                      onChange={(evento) =>
                        field.onChange(Number(evento.target.value))
                      }
                    >
                      <option value="">
                        {!lojaId
                          ? ehReparo
                            ? 'Selecione o setor primeiro...'
                            : 'Selecione a máquina primeiro...'
                          : carregandoTecnicos
                            ? 'Carregando...'
                            : tecnicos.length === 0
                              ? 'Nenhum técnico atende esta loja.'
                              : 'Selecionar técnico...'}
                      </option>
                      {tecnicos.map((tecnico) => (
                        <option key={tecnico.id} value={tecnico.id}>
                          {tecnico.nome} — {tecnico.area}
                        </option>
                      ))}
                    </CampoSelecao>
                  )}
                />
              </div>

              <div className="sm:col-span-2">
                <Botao type="submit" disabled={isPending}>
                  {isPending ? 'Abrindo...' : 'Abrir OS'}
                </Botao>
              </div>
            </form>
          </FormProvider>
        </div>
      </main>
    </div>
  )
}
