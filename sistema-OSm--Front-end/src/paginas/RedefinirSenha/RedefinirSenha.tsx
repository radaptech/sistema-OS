import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { toast } from 'react-toastify'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Botao } from '../../componentes/Botao'
import { CampoTexto } from '../../componentes/CampoTexto'
import { CartaoAutenticacao } from '../../componentes/CartaoAutenticacao'
import { servicoAutenticacao } from '../../servicos/servicoAutenticacao'

// Mesmo mínimo do login (esquemaLogin) e do servidor (model.RedefinirSenha).
const esquemaRedefinirSenha = z
  .object({
    senha: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
    confirmacao: z.string(),
  })
  .refine((dados) => dados.senha === dados.confirmacao, {
    message: 'As senhas não conferem.',
    path: ['confirmacao'],
  })

type DadosRedefinirSenha = z.infer<typeof esquemaRedefinirSenha>

const CLASSE_LINK =
  'text-marca-500 hover:text-marca-800 flex items-center justify-center gap-1.5 text-xs font-medium transition hover:underline'

export function RedefinirSenha() {
  const [parametros] = useSearchParams()
  const token = parametros.get('token')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const navegar = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DadosRedefinirSenha>({
    resolver: zodResolver(esquemaRedefinirSenha),
    defaultValues: { senha: '', confirmacao: '' },
  })

  async function aoEnviar({ senha }: DadosRedefinirSenha) {
    if (!token) return

    await servicoAutenticacao.redefinirSenha({ token, senha })
    toast.success('Senha redefinida. Entre com a nova senha.')
    navegar('/login', { replace: true })
  }

  if (!token) {
    return (
      <CartaoAutenticacao subtitulo="Redefinir senha">
        <div className="mt-6 flex flex-col gap-4 text-center">
          <p className="text-sm text-slate-600">
            Este link está incompleto. Abra o link direto do e-mail ou peça um
            novo.
          </p>
          <Link to="/esqueci-senha" className={CLASSE_LINK}>
            Solicitar novo link
          </Link>
        </div>
      </CartaoAutenticacao>
    )
  }

  const botaoVisibilidade = (
    <button
      type="button"
      onClick={() => setMostrarSenha((valor) => !valor)}
      className="text-marca-500 hover:text-marca-800 transition"
      aria-label={mostrarSenha ? 'Ocultar senha' : 'Exibir senha'}
    >
      {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  )

  return (
    <CartaoAutenticacao subtitulo="Redefinir senha">
      <form
        onSubmit={handleSubmit(aoEnviar)}
        noValidate
        className="mt-6 flex flex-col gap-4"
      >
        <CampoTexto
          rotulo="Nova senha"
          type={mostrarSenha ? 'text' : 'password'}
          autoComplete="new-password"
          autoFocus
          mensagemErro={errors.senha?.message}
          icone={botaoVisibilidade}
          {...register('senha')}
        />

        <CampoTexto
          rotulo="Confirmar nova senha"
          type={mostrarSenha ? 'text' : 'password'}
          autoComplete="new-password"
          mensagemErro={errors.confirmacao?.message}
          {...register('confirmacao')}
        />

        <Botao
          type="submit"
          carregando={isSubmitting}
          rotuloCarregando="Salvando..."
        >
          Salvar nova senha
        </Botao>

        {/* Token expirado cai no toast de erro do api.ts; daqui a pessoa pede outro link sem voltar ao e-mail. */}
        <Link to="/esqueci-senha" className={CLASSE_LINK}>
          <ArrowLeft size={14} /> Solicitar novo link
        </Link>
      </form>
    </CartaoAutenticacao>
  )
}
