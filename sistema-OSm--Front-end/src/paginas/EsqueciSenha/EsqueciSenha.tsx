import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Botao } from '../../componentes/Botao'
import { CampoTexto } from '../../componentes/CampoTexto'
import { CartaoAutenticacao } from '../../componentes/CartaoAutenticacao'
import { servicoAutenticacao } from '../../servicos/servicoAutenticacao'

const esquemaEsqueciSenha = z.object({
  email: z.email('Informe um e-mail válido.'),
})

type DadosEsqueciSenha = z.infer<typeof esquemaEsqueciSenha>

const CLASSE_LINK =
  'text-marca-500 hover:text-marca-800 flex items-center justify-center gap-1.5 text-xs font-medium transition hover:underline'

export function EsqueciSenha() {
  const [emailEnviado, setEmailEnviado] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DadosEsqueciSenha>({
    resolver: zodResolver(esquemaEsqueciSenha),
    defaultValues: { email: '' },
  })

  async function aoEnviar({ email }: DadosEsqueciSenha) {
    await servicoAutenticacao.solicitarRecuperacaoSenha({ email })
    setEmailEnviado(email)
  }

  if (emailEnviado) {
    // O texto é condicional de propósito: o servidor não revela se o e-mail existe, e a tela não pode prometer o contrário.
    return (
      <CartaoAutenticacao subtitulo="Recuperação de senha">
        <div className="mt-6 flex flex-col items-center gap-4 text-center">
          <span className="bg-marca-100 text-marca-600 flex h-12 w-12 items-center justify-center rounded-full">
            <MailCheck size={22} />
          </span>
          <p className="text-sm text-slate-600">
            Se <strong className="text-slate-900">{emailEnviado}</strong>{' '}
            estiver cadastrado, você receberá um link para criar uma nova senha.
            O link vale por 30 minutos.
          </p>
          <p className="text-xs text-slate-400">
            Não chegou? Confira a caixa de spam.
          </p>
          <Link to="/login" className={CLASSE_LINK}>
            <ArrowLeft size={14} /> Voltar para o login
          </Link>
        </div>
      </CartaoAutenticacao>
    )
  }

  return (
    <CartaoAutenticacao subtitulo="Recuperação de senha">
      <form
        onSubmit={handleSubmit(aoEnviar)}
        noValidate
        className="mt-6 flex flex-col gap-4"
      >
        <p className="text-center text-sm text-slate-500">
          Informe o e-mail da sua conta e enviaremos um link para criar uma nova
          senha.
        </p>

        <CampoTexto
          rotulo="E-mail"
          type="email"
          placeholder="seu@email.com"
          autoComplete="email"
          autoFocus
          mensagemErro={errors.email?.message}
          {...register('email')}
        />

        <Botao
          type="submit"
          carregando={isSubmitting}
          rotuloCarregando="Enviando..."
        >
          Enviar link
        </Botao>

        <Link to="/login" className={CLASSE_LINK}>
          <ArrowLeft size={14} /> Voltar para o login
        </Link>
      </form>
    </CartaoAutenticacao>
  )
}
