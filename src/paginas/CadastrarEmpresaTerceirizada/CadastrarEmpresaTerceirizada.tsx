import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { useNavigate, useParams } from 'react-router-dom'
import { Botao } from '../../componentes/Botao'
import { CampoTexto } from '../../componentes/CampoTexto'
import { CabecalhoSubpagina } from '../../componentes/CabecalhoSubpagina'
import { UploadFoto } from '../../componentes/UploadFoto'
import type { AtualizarEmpresaTerceirizadaPayload } from '../../tipos/empresaTerceirizada'
import { servicoEmpresasTerceirizadas } from '../../servicos/servicoEmpresasTerceirizadas'
import {
  esquemaCadastrarEmpresaTerceirizada,
  type DadosCadastrarEmpresaTerceirizada,
} from './esquemaCadastrarEmpresaTerceirizada'

export function CadastrarEmpresaTerceirizada() {
  const navegar = useNavigate()
  const { id } = useParams<{ id: string }>()
  const emEdicao = Boolean(id)
  // Foto escolhida agora, ainda não enviada. Sem ela, salvar mantém a que está no servidor.
  const [foto, setFoto] = useState<File | null>(null)
  const queryClient = useQueryClient()

  const { data: empresaExistente } = useQuery({
    queryKey: ['empresa-terceirizada', id],
    // Formulário/confirmação: sempre o registro atual, nunca o do cache (o padrão
    // de 30s do App.tsx reabriria a edição com o valor de antes de salvar).
    staleTime: 0,
    queryFn: () => servicoEmpresasTerceirizadas.obterPorId(Number(id)),
    enabled: emEdicao,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DadosCadastrarEmpresaTerceirizada>({
    resolver: zodResolver(esquemaCadastrarEmpresaTerceirizada),
    defaultValues: { nome: '', especialidade: '', telefone: '' },
  })

  useEffect(() => {
    if (empresaExistente) {
      reset({
        nome: empresaExistente.nome,
        especialidade: empresaExistente.especialidade ?? '',
        telefone: empresaExistente.telefone ?? '',
      })
    }
  }, [empresaExistente, reset])

  const { mutateAsync: criar, isPending: criando } = useMutation({
    mutationFn: (dados: DadosCadastrarEmpresaTerceirizada) => servicoEmpresasTerceirizadas.criar(dados, foto ?? undefined),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['empresas-terceirizadas'] }),
  })

  const { mutateAsync: atualizar, isPending: atualizando } = useMutation({
    mutationFn: (dados: AtualizarEmpresaTerceirizadaPayload) =>
      servicoEmpresasTerceirizadas.atualizar(dados, foto ?? undefined),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['empresas-terceirizadas'] }),
  })

  async function aoEnviar(dados: DadosCadastrarEmpresaTerceirizada) {
    if (emEdicao && id) {
      await atualizar({ id: Number(id), ...dados })
      toast.success('Empresa terceirizada atualizada com sucesso.')
      navegar(-1)
      return
    }

    await criar(dados)
    toast.success('Empresa terceirizada cadastrada com sucesso.')
    reset({ nome: '', especialidade: '', telefone: '' })
    setFoto(null)
  }

  const isPending = criando || atualizando

  return (
    <div className="flex min-h-svh flex-col bg-slate-50">
      <CabecalhoSubpagina
        contexto="Painel do Administrador"
        titulo={emEdicao ? 'Editar Empresa Terceirizada' : 'Cadastrar Empresa Terceirizada'}
        Icone={Building2}
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
              urlExistente={empresaExistente?.fotoUrl}
              rotulo="Foto / Logo da Empresa"
              textoAlternativo="Pré-visualização da empresa"
            />

            <CampoTexto
              rotulo="Nome *"
              placeholder="Ex: Balanças Cooprata Assistência Técnica"
              mensagemErro={errors.nome?.message}
              {...register('nome')}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <CampoTexto
                rotulo="Especialidade"
                placeholder="Ex: Balanças e instrumentos de pesagem"
                mensagemErro={errors.especialidade?.message}
                {...register('especialidade')}
              />
              <CampoTexto
                rotulo="Telefone"
                placeholder="Ex: (11) 4002-8922"
                mensagemErro={errors.telefone?.message}
                {...register('telefone')}
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
