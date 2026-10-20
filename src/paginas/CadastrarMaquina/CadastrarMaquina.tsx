import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, PackagePlus } from 'lucide-react'
import { toast } from 'react-toastify'
import { useNavigate, useParams } from 'react-router-dom'
import { Botao } from '../../componentes/Botao'
import { CampoTexto } from '../../componentes/CampoTexto'
import { CampoSelecao } from '../../componentes/CampoSelecao'
import { CampoTextoArea } from '../../componentes/CampoTextoArea'
import { CabecalhoSubpagina } from '../../componentes/CabecalhoSubpagina'
import { servicoMaquinas } from '../../servicos/servicoMaquinas'
import { servicoPreventivas } from '../../servicos/servicoPreventivas'
import { useLojas } from '../../hooks/useLojas'
import { useSetores } from '../../hooks/useSetores'
import { niveisCriticidade, type NovaMaquinaPayload } from '../../tipos/maquina'
import {
  esquemaCadastrarMaquina,
  type DadosCadastrarMaquina,
} from './esquemaCadastrarMaquina'
import { UploadFoto } from '../../componentes/UploadFoto'
import { CampoPreventivas } from './componentes/CampoPreventivas'
import { converterDataBackendParaFormulario } from '../../utilitarios/dataBackend'

const VALORES_PADRAO: DadosCadastrarMaquina = {
  numeroPatrimonio: '',
  serie: '',
  nome: '',
  descricao: '',
  marca: '',
  modelo: '',
  criticidade: undefined as unknown as DadosCadastrarMaquina['criticidade'],
  lojaId: 0,
  setorId: 0,
  preventivas: [],
}

export function CadastrarMaquina() {
  const navegar = useNavigate()
  const { id } = useParams<{ id: string }>()
  const emEdicao = Boolean(id)
  const [foto, setFoto] = useState<File | null>(null)
  const { data: lojas = [] } = useLojas()
  const maquinaId = Number(id)

  const { data: maquinaExistente } = useQuery({
    queryKey: ['maquina', id],
    // Formulário/confirmação: sempre o registro atual, nunca o do cache (o padrão
    // de 30s do App.tsx reabriria a edição com o valor de antes de salvar).
    staleTime: 0,
    queryFn: () => servicoMaquinas.obterPorId(maquinaId),
    enabled: emEdicao,
  })

  const { data: preventivasExistentes = [] } = useQuery({
    queryKey: ['preventivas-da-maquina', id],
    // Formulário/confirmação: sempre o registro atual, nunca o do cache (o padrão
    // de 30s do App.tsx reabriria a edição com o valor de antes de salvar).
    staleTime: 0,
    queryFn: () => servicoPreventivas.listar({ maquinaId }),
    enabled: emEdicao,
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<DadosCadastrarMaquina>({
    resolver: zodResolver(esquemaCadastrarMaquina),
    defaultValues: VALORES_PADRAO,
  })

  useEffect(() => {
    if (!maquinaExistente) {
      return
    }

    reset({
      ...VALORES_PADRAO,
      numeroPatrimonio: maquinaExistente.numeroPatrimonio ?? '',
      serie: maquinaExistente.serie ?? '',
      nome: maquinaExistente.nome,
      descricao: maquinaExistente.descricao ?? '',
      marca: maquinaExistente.marca ?? '',
      modelo: maquinaExistente.modelo ?? '',
      criticidade: maquinaExistente.criticidade,
      lojaId: maquinaExistente.lojaId,
      setorId: maquinaExistente.setorId,
      preventivas: preventivasExistentes.map((preventiva) => ({
        // Sem o id o servidor trataria como preventiva nova e a de antes, com o
        // histórico, seria desativada.
        id: preventiva.id,
        maquinaId: preventiva.maquinaId,
        // Preventiva cadastrada antes de o técnico virar obrigatório volta sem ele: cai
        // em 0, o Zod recusa e o Administrador é obrigado a escolher um ao salvar.
        tecnicoId: preventiva.tecnicoId ?? 0,
        descricao: preventiva.descricao,
        intervaloDias: preventiva.intervaloDias,
        proximaData: converterDataBackendParaFormulario(preventiva.proximaData),
        ativa: preventiva.ativa,
      })),
    })
  }, [maquinaExistente, preventivasExistentes, reset])

  const nomeMaquina = useWatch({ control, name: 'nome' })
  const lojaSelecionadaId = useWatch({ control, name: 'lojaId' })
  const { data: setoresDaLoja = [] } = useSetores(lojaSelecionadaId || undefined)

  // O <select> de setor só ganha as options quando useSetores(lojaId) responde, e o
  // reset() da edição roda ANTES disso: o valor cai num select que ainda não tem a
  // option correspondente e o campo aparece em "Selecionar...", obrigatório e vazio.
  // Reaplica assim que a lista da loja chega. Não atrapalha quem está editando à mão:
  // setoresDaLoja é referência estável do cache, então o efeito não re-roda a cada
  // escolha do usuário.
  useEffect(() => {
    if (!maquinaExistente || setoresDaLoja.length === 0) {
      return
    }

    if (setoresDaLoja.some((setor) => setor.id === maquinaExistente.setorId)) {
      setValue('setorId', maquinaExistente.setorId)
    }
  }, [maquinaExistente, setoresDaLoja, setValue])

  // Trocar de loja invalida o setor escolhido (ele pertence à loja anterior). A limpeza
  // fica no onChange do select, e não num watch da lojaId, para não apagar o setor que o
  // reset() acabou de preencher ao carregar a máquina em edição.
  const registroLoja = register('lojaId', { valueAsNumber: true })

  // lojaId não entra no payload: o servidor deriva a loja a partir do setor. No
  // formulário ele serve só para restringir a lista de setores à loja escolhida.
  function montarPayload(dados: DadosCadastrarMaquina): NovaMaquinaPayload {
    return {
      numeroPatrimonio: dados.numeroPatrimonio,
      serie: dados.serie,
      nome: dados.nome,
      descricao: dados.descricao,
      marca: dados.marca,
      modelo: dados.modelo,
      criticidade: dados.criticidade,
      setorId: dados.setorId,
      preventivas: dados.preventivas,
    }
  }

  // As preventivas viajam junto com a máquina, então as duas listas mudam.
  const queryClient = useQueryClient()
  async function invalidarMaquinas() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['maquinas'] }),
      queryClient.invalidateQueries({ queryKey: ['preventivas'] }),
    ])
  }

  const { mutateAsync: criar, isPending: criando } = useMutation({
    mutationFn: (dados: DadosCadastrarMaquina) =>
      servicoMaquinas.criar(montarPayload(dados), foto ?? undefined),
    onSuccess: invalidarMaquinas,
  })

  const { mutateAsync: atualizar, isPending: atualizando } = useMutation({
    mutationFn: (dados: DadosCadastrarMaquina) =>
      servicoMaquinas.atualizar(
        { id: maquinaId, ...montarPayload(dados) },
        foto ?? undefined,
      ),
    onSuccess: invalidarMaquinas,
  })

  async function aoEnviar(dados: DadosCadastrarMaquina) {
    if (emEdicao) {
      await atualizar(dados)
      toast.success('Máquina atualizada com sucesso.')
    } else {
      await criar(dados)
      toast.success('Máquina cadastrada com sucesso.')
    }

    reset(VALORES_PADRAO)
    setFoto(null)
    navegar(-1)
  }

  const isPending = criando || atualizando

  return (
    <div className="flex min-h-svh flex-col bg-slate-50">
      <CabecalhoSubpagina
        contexto="Painel do Administrador"
        titulo={emEdicao ? 'Editar Máquina' : 'Cadastrar Máquina'}
        Icone={PackagePlus}
      />

      <main className="flex flex-1 justify-center px-4 py-8">
        <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-sm">
          <form
            onSubmit={handleSubmit(aoEnviar)}
            noValidate
            className="flex flex-col gap-5 p-6 sm:p-8"
          >
            <UploadFoto
              foto={foto}
              aoSelecionarFoto={setFoto}
              urlExistente={maquinaExistente?.fotoUrl}
            />

            <CampoTexto
              rotulo="Nome *"
              placeholder="Ex: Pasteurizador 33"
              mensagemErro={errors.nome?.message}
              {...register('nome')}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <CampoTexto
                rotulo="Número do Patrimônio *"
                placeholder="Ex: 000123"
                mensagemErro={errors.numeroPatrimonio?.message}
                {...register('numeroPatrimonio')}
              />
              <CampoTexto
                rotulo="Série *"
                placeholder="Ex: SN-4482910"
                mensagemErro={errors.serie?.message}
                {...register('serie')}
              />
            </div>

            <CampoTextoArea
              rotulo="Descrição"
              rows={3}
              placeholder="Descreva brevemente a máquina e sua função..."
              mensagemErro={errors.descricao?.message}
              {...register('descricao')}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <CampoTexto
                rotulo="Marca"
                placeholder="Ex: Arsopi"
                mensagemErro={errors.marca?.message}
                {...register('marca')}
              />
              <CampoTexto
                rotulo="Modelo"
                placeholder="Ex: X200-CNC"
                mensagemErro={errors.modelo?.message}
                {...register('modelo')}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <CampoSelecao
                rotulo="Criticidade *"
                mensagemErro={errors.criticidade?.message}
                {...register('criticidade')}
              >
                <option value="">Selecionar...</option>
                {niveisCriticidade.map((nivel) => (
                  <option key={nivel} value={nivel}>
                    {nivel}
                  </option>
                ))}
              </CampoSelecao>

              <CampoSelecao
                rotulo="Loja *"
                mensagemErro={errors.lojaId?.message}
                {...registroLoja}
                onChange={(evento) => {
                  registroLoja.onChange(evento)
                  setValue('setorId', 0)
                }}
              >
                <option value="">Selecionar...</option>
                {lojas.map((loja) => (
                  <option key={loja.id} value={loja.id}>
                    {loja.nome}
                  </option>
                ))}
              </CampoSelecao>

              {/* Setor é cadastrado por loja: a lista só existe depois de escolher a loja. */}
              <CampoSelecao
                rotulo="Setor *"
                disabled={!lojaSelecionadaId}
                mensagemErro={errors.setorId?.message}
                {...register('setorId', { valueAsNumber: true })}
              >
                <option value="">
                  {lojaSelecionadaId ? 'Selecionar...' : 'Selecione a loja primeiro'}
                </option>
                {setoresDaLoja.map((setor) => (
                  <option key={setor.id} value={setor.id}>
                    {setor.nome}
                  </option>
                ))}
              </CampoSelecao>
            </div>

            <CampoPreventivas
              control={control}
              errors={errors}
              nomeMaquina={nomeMaquina}
              lojaId={lojaSelecionadaId}
            />

            <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row">
              <div className="flex-1">
                <Botao type="button" variante="secundario" onClick={() => navegar(-1)}>
                  Cancelar
                </Botao>
              </div>
              <div className="flex-1">
                <Botao
                  type="submit"
                  carregando={isPending}
                  className="flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  {emEdicao ? 'Salvar Alterações' : 'Cadastrar'}
                </Botao>
              </div>
            </div>
          </form>
        </div>
      </main>

      <footer className="py-4 text-center">
        <span className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
          Solicitação OS © {new Date().getFullYear()}
        </span>
      </footer>
    </div>
  )
}
