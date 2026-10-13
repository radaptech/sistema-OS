import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Store } from 'lucide-react'
import { toast } from 'react-toastify'
import { useNavigate, useParams } from 'react-router-dom'
import { Botao } from '../../componentes/Botao'
import { CampoTexto } from '../../componentes/CampoTexto'
import { CabecalhoSubpagina } from '../../componentes/CabecalhoSubpagina'
import { useEmpresas } from '../../hooks/useEmpresas'
import { useLojas } from '../../hooks/useLojas'
import { servicoLojas } from '../../servicos/servicoLojas'
import { esquemaCadastrarLoja, type DadosCadastrarLoja } from './esquemaCadastrarLoja'

export function CadastrarLoja() {
  const navegar = useNavigate()
  const { id } = useParams<{ id: string }>()
  const emEdicao = Boolean(id)
  const queryClient = useQueryClient()
  const { data: empresas = [] } = useEmpresas()
  const { data: lojas = [] } = useLojas()

  const { data: lojaExistente } = useQuery({
    queryKey: ['loja', id],
    // Formulário/confirmação: sempre o registro atual, nunca o do cache (o padrão
    // de 30s do App.tsx reabriria a edição com o valor de antes de salvar).
    staleTime: 0,
    queryFn: () => servicoLojas.obterPorId(Number(id)),
    enabled: emEdicao,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DadosCadastrarLoja>({
    resolver: zodResolver(esquemaCadastrarLoja),
    defaultValues: { nome: '' },
  })

  useEffect(() => {
    if (lojaExistente) {
      reset({ nome: lojaExistente.nome })
    }
  }, [lojaExistente, reset])

  const { mutateAsync: criar, isPending: criando } = useMutation({
    mutationFn: servicoLojas.criar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lojas'] }),
  })

  const { mutateAsync: atualizar, isPending: atualizando } = useMutation({
    mutationFn: servicoLojas.atualizar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lojas'] }),
  })

  async function aoEnviar(dados: DadosCadastrarLoja) {
    if (emEdicao && id) {
      await atualizar({ id: Number(id), ...dados })
      toast.success('Loja atualizada com sucesso.')
      navegar(-1)
      return
    }

    await criar(dados)
    toast.success('Loja cadastrada com sucesso.')
    reset({ nome: '' })
  }

  // Uma empresa por tenant (empresa É o tenant no back-end), então toda loja
  // listada já é dessa empresa -- não há o que filtrar.
  const empresa = empresas[0]
  const isPending = criando || atualizando

  return (
    <div className="flex min-h-svh flex-col bg-slate-50">
      <CabecalhoSubpagina
        contexto="Painel do Administrador"
        titulo={emEdicao ? 'Editar Loja' : 'Cadastrar Loja'}
        Icone={Store}
      />

      <main className="flex flex-1 justify-center px-4 py-8">
        <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-sm">
          <form
            onSubmit={handleSubmit(aoEnviar)}
            noValidate
            className="flex flex-col gap-5 p-6 sm:p-8"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <CampoTexto
                rotulo="Nome *"
                placeholder="Ex: Loja 4 - Zona Norte"
                mensagemErro={errors.nome?.message}
                {...register('nome')}
              />

              {/* Empresa não é escolha: há exatamente uma por tenant e o
                  servidor a deriva do token. Fica visível só como contexto. */}
              <CampoTexto
                rotulo="Empresa"
                name="empresa"
                value={empresa?.nome ?? ''}
                readOnly
                tabIndex={-1}
                className="cursor-default opacity-70"
              />
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

            {!emEdicao && (
              <div className="flex flex-col gap-2 border-t border-slate-100 pt-5">
                <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  Lojas já cadastradas dessa empresa
                </span>
                {lojas.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhuma loja cadastrada ainda.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {lojas.map((loja) => (
                      <span
                        key={loja.id}
                        className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                      >
                        <Store size={12} />
                        {loja.nome}
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
