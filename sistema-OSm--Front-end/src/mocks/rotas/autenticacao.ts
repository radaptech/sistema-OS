import type {
  CredenciaisLogin,
  RedefinicaoSenha,
  SolicitacaoRecuperacaoSenha,
} from '../../tipos/autenticacao'
import { obterUsuarioSessao, usuarios } from '../bancoMock'
import { construirSessao } from '../regrasMock'
import {
  atraso,
  definirIdSessao,
  responderErro,
  responderJson,
  type Rota,
} from '../utilidadesMock'

export const rotasAutenticacao: Rota[] = [
  {
    metodo: 'POST',
    padrao: /^\/autenticacao\/login$/,
    async tratar({ corpo }) {
      await atraso()
      const credenciais = corpo as CredenciaisLogin

      // Sem comparar perfil: ele saiu do corpo do login (ver CredenciaisLogin). Quem diz
      // o perfil é o próprio usuário encontrado, e é ele que vai para a sessão abaixo.
      const usuario = usuarios.find(
        (item) =>
          item.ativo &&
          item.email.toLowerCase() === credenciais.email?.toLowerCase() &&
          item.senha === credenciais.senha,
      )

      if (!usuario) {
        return responderErro('E-mail ou senha inválidos.', 401)
      }

      definirIdSessao(usuario.id)
      return responderJson(construirSessao(usuario))
    },
  },
  {
    metodo: 'GET',
    padrao: /^\/autenticacao\/sessao$/,
    async tratar() {
      await atraso()
      const usuario = obterUsuarioSessao()

      if (!usuario) {
        return responderErro('Não autenticado.', 401)
      }

      return responderJson(construirSessao(usuario))
    },
  },
  {
    metodo: 'POST',
    padrao: /^\/autenticacao\/logout$/,
    async tratar() {
      await atraso()
      definirIdSessao(null)
      return responderJson(null)
    },
  },
  {
    metodo: 'POST',
    padrao: /^\/autenticacao\/esqueci-senha$/,
    async tratar({ corpo }) {
      await atraso()
      const { email } = corpo as SolicitacaoRecuperacaoSenha
      const usuario = usuarios.find(
        (item) =>
          item.ativo && item.email.toLowerCase() === email?.toLowerCase(),
      )

      // Sem e-mail de verdade no mock: o link sai no console, e a resposta não diz se o e-mail existe.
      if (usuario) {
        console.info(
          `[mock] link de recuperação: /redefinir-senha?token=mock-${usuario.id}`,
        )
      }

      return responderJson({
        message:
          'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.',
      })
    },
  },
  {
    metodo: 'POST',
    padrao: /^\/autenticacao\/redefinir-senha$/,
    async tratar({ corpo }) {
      await atraso()
      const { token, senha } = corpo as RedefinicaoSenha
      const usuario = usuarios.find(
        (item) => item.ativo && `mock-${item.id}` === token,
      )

      if (!usuario) {
        return responderErro(
          'link de recuperação inválido ou expirado, solicite um novo',
          400,
        )
      }

      usuario.senha = senha
      return responderJson({ message: 'Senha redefinida com sucesso.' })
    },
  },
]
