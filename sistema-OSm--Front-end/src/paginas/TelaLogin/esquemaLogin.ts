import { z } from 'zod'

// Sem `perfil`: ele saiu do login (ver CredenciaisLogin). O perfil de quem entrou vem na
// resposta, resolvido no servidor a partir do usuário — nunca do que foi escolhido aqui.
export const esquemaLogin = z.object({
  email: z.email('Informe um e-mail válido.'),
  senha: z
    .string()
    .min(1, 'Informe a senha.')
    .min(6, 'A senha deve ter no mínimo 6 caracteres.'),
})

export type DadosLogin = z.infer<typeof esquemaLogin>
