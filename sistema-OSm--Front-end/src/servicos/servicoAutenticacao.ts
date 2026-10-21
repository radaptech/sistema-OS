import { api } from './api'
import type {
  CredenciaisLogin,
  RedefinicaoSenha,
  SessaoUsuario,
  SolicitacaoRecuperacaoSenha,
} from '../tipos/autenticacao'

export const servicoAutenticacao = {
  // A sessão volta em cookie HttpOnly; o corpo traz o escopo de acesso do usuário.
  entrar: (credenciais: CredenciaisLogin) =>
    api.post<SessaoUsuario>('/autenticacao/login', credenciais),

  // Chamado no bootstrap do app: sem isso, recarregar a página derrubaria a sessão do
  // lado do cliente mesmo com o cookie ainda válido no servidor.
  obterSessao: () => api.get<SessaoUsuario>('/autenticacao/sessao'),

  sair: () => api.post<void>('/autenticacao/logout'),

  solicitarRecuperacaoSenha: (dados: SolicitacaoRecuperacaoSenha) =>
    api.post<{ message: string }>('/autenticacao/esqueci-senha', dados),

  redefinirSenha: (dados: RedefinicaoSenha) =>
    api.post<{ message: string }>('/autenticacao/redefinir-senha', dados),
}
