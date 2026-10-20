import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, UserPlus } from 'lucide-react'
import { toast } from 'react-toastify'
import { useNavigate, useParams } from 'react-router-dom'
import { Botao } from '../../componentes/Botao'
import { CampoTexto } from '../../componentes/CampoTexto'
import { SeletorPerfil } from '../../componentes/SeletorPerfil'
import { CabecalhoSubpagina } from '../../componentes/CabecalhoSubpagina'
import { servicoUsuarios } from '../../servicos/servicoUsuarios'
import {
  criarEsquemaCadastrarUsuario,
  type DadosCadastrarUsuario,
} from './esquemaCadastrarUsuario'
import { CamposAcesso } from './componentes/CamposAcesso'

const VALORES_PADRAO: DadosCadastrarUsuario = {
  nome: '',
  telefone: '',
  email: '',
  senha: '',
  perfil: 'solicitante',
  lojasIds: [],
  setoresIds: [],
  acessoTotalSetores: false,
  area: undefined,
  valorHora: undefined,
}

export function CadastrarUsuario() {
  const navegar = useNavigate()
  const { id } = useParams<{ id: string }>()
  const emEdicao = Boolean(id)

  const esquema = useMemo(
    () => criarEsquemaCadastrarUsuario(emEdicao),
    [emEdicao],
  )

  const { data: usuarioExistente } = useQuery({
    queryKey: ['usuario', id],
    // Formulário/confirmação: sempre o registro atual, nunca o do cache (o padrão
    // de 30s do App.tsx reabriria a edição com o valor de antes de salvar).
    staleTime: 0,
    queryFn: () => servicoUsuarios.obterPorId(Number(id)),
    enabled: emEdicao,
  })

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<DadosCadastrarUsuario>({
    resolver: zodResolver(esquema),
    defaultValues: VALORES_PADRAO,
  })

  useEffect(() => {
    if (!usuarioExistente) {
      return
    }

    reset({
      ...VALORES_PADRAO,
      nome: usuarioExistente.nome,
      telefone: usuarioExistente.telefone ?? '',
      email: usuarioExistente.email,
      perfil: usuarioExistente.perfil,
      lojasIds: usuarioExistente.lojasIds,
      setoresIds: usuarioExistente.setoresIds,
      acessoTotalSetores: usuarioExistente.acessoTotalSetores,
      // Sem a área o técnico abria com o campo obrigatório em branco.
      area: usuarioExistente.area,
      valorHora: usuarioExistente.valorHora,
    })
  }, [usuarioExistente, reset])

  const perfil = useWatch({ control, name: 'perfil' })
  const lojasIds = useWatch({ control, name: 'lojasIds' })
  const setoresIds = useWatch({ control, name: 'setoresIds' })
  const acessoTotalSetores = useWatch({ control, name: 'acessoTotalSetores' })
  const area = useWatch({ control, name: 'area' })

  // Técnico é usuário: o select de técnico (useTecnicos) também precisa recarregar.
  const queryClient = useQueryClient()
  async function invalidarUsuarios() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
      queryClient.invalidateQueries({ queryKey: ['tecnicos'] }),
    ])
  }

  const { mutateAsync: criar, isPending: criando } = useMutation({
    mutationFn: servicoUsuarios.criar,
    onSuccess: invalidarUsuarios,
  })

  const { mutateAsync: atualizar, isPending: atualizando } = useMutation({
    mutationFn: servicoUsuarios.atualizar,
    onSuccess: invalidarUsuarios,
  })

  async function aoEnviar(dados: DadosCadastrarUsuario) {
    if (emEdicao && id) {
      // Senha em branco não vai no payload: o servidor mantém a atual.
      const { senha, ...resto } = dados
      await atualizar({ id: Number(id), ...resto, ...(senha ? { senha } : {}) })
      toast.success('Usuário atualizado com sucesso.')
    } else {
      await criar(dados)
      toast.success('Usuário cadastrado com sucesso.')
    }

    reset(VALORES_PADRAO)
    navegar(-1)
  }

  const isPending = criando || atualizando

  return (
    <div className="flex min-h-svh flex-col bg-slate-50">
      <CabecalhoSubpagina
        contexto="Painel do Administrador"
        titulo={emEdicao ? 'Editar Usuário' : 'Cadastrar Usuário'}
        Icone={UserPlus}
      />

      <main className="flex flex-1 justify-center px-4 py-8">
        <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-sm">
          <form
            onSubmit={handleSubmit(aoEnviar)}
            noValidate
            className="flex flex-col gap-5 p-6 sm:p-8"
          >
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-xs font-semibold tracking-wider text-marca-500 uppercase">
                Perfil *
              </span>
              <SeletorPerfil
                perfilSelecionado={perfil}
                aoSelecionar={(perfil) => {
                  setValue('perfil', perfil)
                  setValue('lojasIds', [])
                  setValue('setoresIds', [])
                  setValue('acessoTotalSetores', false)
                  setValue('area', undefined)
                  setValue('valorHora', undefined)
                }}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <CampoTexto
                rotulo="Nome *"
                placeholder="Nome completo"
                mensagemErro={errors.nome?.message}
                {...register('nome')}
              />
              <CampoTexto
                rotulo="Telefone"
                placeholder="(00) 00000-0000"
                mensagemErro={errors.telefone?.message}
                {...register('telefone')}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <CampoTexto
                rotulo="E-mail *"
                type="email"
                placeholder="usuario@empresa.com"
                mensagemErro={errors.email?.message}
                {...register('email')}
              />
              <CampoTexto
                rotulo={emEdicao ? 'Nova senha' : 'Senha *'}
                type="password"
                autoComplete="new-password"
                placeholder={
                  emEdicao
                    ? 'Em branco mantém a atual'
                    : 'Senha de acesso'
                }
                mensagemErro={errors.senha?.message}
                {...register('senha')}
              />
            </div>

            <CamposAcesso
              className="border-t border-slate-100 pt-5"
              perfil={perfil}
              lojasIds={lojasIds}
              setoresIds={setoresIds}
              acessoTotalSetores={acessoTotalSetores}
              area={area}
              aoAlterarLojas={(lojas) => setValue('lojasIds', lojas, { shouldValidate: true })}
              aoAlterarSetores={(novosSetores) =>
                setValue('setoresIds', novosSetores, { shouldValidate: true })
              }
              aoAlternarAcessoTotal={(valor) => {
                setValue('acessoTotalSetores', valor)
                if (valor) {
                  setValue('setoresIds', [])
                }
              }}
              aoAlterarArea={(valor) =>
                setValue('area', valor as DadosCadastrarUsuario['area'], {
                  shouldValidate: true,
                })
              }
              erroLojas={errors.lojasIds?.message}
              erroSetores={errors.setoresIds?.message}
              erroArea={errors.area?.message}
            />

            {/* Tarifa de referência do Técnico. Não preenche nada sozinha: o custo da OS
                continua sendo o que ele lança no encerramento. */}
            {perfil === 'tecnico' && (
              <div className="sm:w-1/2 sm:pr-2.5">
                <CampoTexto
                  rotulo="Valor em Hora (R$)"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  placeholder="Ex: 85,00"
                  mensagemErro={errors.valorHora?.message}
                  {...register('valorHora', {
                    // Campo vazio vira undefined (opcional), e não NaN/0.
                    setValueAs: (valor) =>
                      valor === '' || valor === null || valor === undefined
                        ? undefined
                        : Number(valor),
                  })}
                />
              </div>
            )}

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
