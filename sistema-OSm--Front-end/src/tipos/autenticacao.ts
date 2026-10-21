export const perfisLogin = [
  'solicitante',
  'tecnico',
  'gestor',
  'administrador',
] as const

export type PerfilLogin = (typeof perfisLogin)[number]

// setoresIds: 'todos' = acesso a todos os setores da loja; number[] = acesso restrito aos
// setores cadastrados cujos ids estão na lista.
export interface EscopoAcessoGestor {
  lojaId: number
  setoresIds: number[] | 'todos'
}

// ⚠️ Sem `perfil`, e a ausência é deliberada. O campo existiu até aqui e o servidor o
// comparava com o perfil do usuário, devolvendo "credenciais inválidas" quando não batia —
// ou seja, ele nunca autorizou nada: quem manda é sempre a linha do banco, e é de lá que
// saem o token e a `SessaoUsuario` abaixo. O efeito prático era transformar "cliquei na
// aba errada" em "e-mail ou senha inválidos", uma mensagem que não tinha como explicar o
// erro real.
export interface CredenciaisLogin {
  email: string
  senha: string
}

// Payload devolvido por POST /autenticacao/login e por GET /autenticacao/sessao.
// É ele que carrega o escopo de acesso do usuário — o front não deriva nada disso.
export interface SessaoUsuario {
  id: number
  nome: string
  email: string
  perfil: PerfilLogin
  // Solicitante: loja e setor onde atua. Demais perfis: nulos.
  lojaId: number | null
  setorId: number | null
  setorNome: string | null
  // Gestor: escopos de Loja/Setor. Demais perfis: nulo.
  escoposGestor: EscopoAcessoGestor[] | null
  // Técnico: id usado para filtrar as OS do painel. Demais perfis: nulo.
  tecnicoId: number | null
}

// Corpo de POST /autenticacao/esqueci-senha. A resposta é a mesma exista o e-mail ou não.
export interface SolicitacaoRecuperacaoSenha {
  email: string
}

// Corpo de POST /autenticacao/redefinir-senha — o token chega pelo link do e-mail (?token=).
export interface RedefinicaoSenha {
  token: string
  senha: string
}
