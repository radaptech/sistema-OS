import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Tag } from 'lucide-react'
import { toast } from 'react-toastify'
import { useNavigate, useParams } from 'react-router-dom'
import { Botao } from '../../componentes/Botao'
import { CampoTexto } from '../../componentes/CampoTexto'
import { CampoSelecao } from '../../componentes/CampoSelecao'
import { CabecalhoSubpagina } from '../../componentes/CabecalhoSubpagina'
import { useLojas } from '../../hooks/useLojas'
import { useSetores } from '../../hooks/useSetores'
import { servicoSetores } from '../../servicos/servicoSetores'
import { esquemaCadastrarSetor, type DadosCadastrarSetor } from './esquemaCadastrarSetor'

export function CadastrarSetor() {
  const navegar = useNavigate()
  const { id } = useParams<{ id: string }>()
  const emEdicao = Boolean(id)
  const queryClient = useQueryClient()
  const { data: lojas = [] } = useLojas()

  const { data: setorExistente } = useQuery({
    queryKey: ['setor', id],
    // Formulário/confirmação: sempre o registro atual, nunca o do cache (o padrão
    // de 30s do App.tsx reabriria a edição com o valor de antes de salvar).
    staleTime: 0,
    queryFn: () => servicoSetores.obterPorId(Number(id)),
    enabled: emEdicao,
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<DadosCadastrarSetor>({
    resolver: zodResolver(esquemaCadastrarSetor),
    defaultValues: { nome: '', lojaId: 0 },
  })

  useEffect(() => {
    if (setorExistente) {
      reset({ nome: setorExistente.nome, lojaId: setorExistente.lojaId })
    }
  }, [setorExistente, reset])

  const lojaId = useWatch({ control, name: 'lojaId' })
  const { data: setoresDaLoja = [] } = useSetores(lojaId || undefined)

  const { mutateAsync: criar, isPending: criando } = useMutation({
    mutationFn: servicoSetores.criar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['setores'] }),
  })

  const { mutateAsync: atualizar, isPending: atualizando } = useMutation({
    mutationFn: servicoSetores.atualizar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['setores'] }),
  })

  async function aoEnviar(dados: DadosCadastrarSetor) {
    if (emEdicao && id) {
      await atualizar({ id: Number(id), ...dados })
      toast.success('Setor atualizado com sucesso.')
      navegar(-1)
      return
    }

    await criar(dados)
    toast.success('Setor cadastrado com sucesso.')
    reset({ nome: '', lojaId: dados.lojaId })
  }

  const isPending = criando || atualizando

  return (
    <div className="flex min-h-svh flex-col bg-slate-50">
      <CabecalhoSubpagina
        contexto="Painel do Administrador"
        titulo={emEdicao ? 'Editar Setor' : 'Cadastrar Setor'}
        Icone={Tag}
      />

      <main className="flex flex-1 justify-center px-4 py-8">
        <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-sm">
          <form
            onSubmit={handleSubmit(aoEnviar)}
            noValidate
            className="flex flex-col gap-5 p-6 sm:p-8"
          >
            <p className="text-sm text-slate-500">
              Setores podem se repetir entre lojas diferentes — ex: "Padaria" pode existir
              na Loja 1 e na Loja 2 como cadastros independentes.
            </p>

            <div className="grid gap-5 sm:grid-cols-2">
              <CampoTexto
                rotulo="Nome *"
                placeholder="Ex: Rotisseria"
                mensagemErro={errors.nome?.message}
                {...register('nome')}
              />

              <CampoSelecao
                rotulo="Loja *"
                mensagemErro={errors.lojaId?.message}
                {...register('lojaId', { valueAsNumber: true })}
              >
                <option value="">Selecionar...</option>
                {lojas.map((loja) => (
                  <option key={loja.id} value={loja.id}>
                    {loja.nome}
                  </option>
                ))}
              </CampoSelecao>
            </div>

            <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row">
              <div className="flex-1">
                <Botao type="button" variante="secundario" onClick={() => navegar(-1)}>
                  Voltar
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

            {/* lojaId > 0 e não só lojaId: o select começa em 0, e `0 && (...)`
                avalia para 0 — que o React RENDERIZA, deixando um zero solto na
                tela enquanto nenhuma loja está escolhida. */}
            {!emEdicao && lojaId > 0 && (
              <div className="flex flex-col gap-2 border-t border-slate-100 pt-5">
                <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  Setores já cadastrados nessa loja
                </span>
                {setoresDaLoja.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhum setor cadastrado ainda.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {setoresDaLoja.map((setor) => (
                      <span
                        key={setor.id}
                        className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                      >
                        <Tag size={12} />
                        {setor.nome}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
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
