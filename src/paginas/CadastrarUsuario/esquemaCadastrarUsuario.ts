import { z } from 'zod'
import { perfisLogin } from '../../tipos/autenticacao'
import { areasTecnico } from '../../tipos/tecnico'

// Fábrica e não constante por causa da senha: no cadastro é obrigatória; na edição é
// opcional — em branco o servidor mantém o hash atual (AtualizarUsuarioPayload.senha).
// A regra fica no objeto base, e não no superRefine, porque o Zod pula o superRefine
// quando o base falha: o erro de senha só apareceria na segunda tentativa.
export const criarEsquemaCadastrarUsuario = (emEdicao: boolean) =>
  z
    .object({
      nome: z.string().min(1, 'Informe o nome.').max(100),
      telefone: z.string().max(20).optional(),
      email: z.email('Informe um e-mail válido.'),
      senha: emEdicao
        ? z
            .string()
            .refine(
              (senha) => senha === '' || senha.length >= 6,
              'A nova senha deve ter no mínimo 6 caracteres.',
            )
        : z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
      perfil: z.enum(perfisLogin, 'Selecione o perfil.'),
      lojasIds: z.array(z.number().int().positive()),
      setoresIds: z.array(z.number().int().positive()),
      acessoTotalSetores: z.boolean(),
      area: z.enum(areasTecnico).optional(),
      // Opcional: técnico sem tarifa cadastrada é válido. Zero também (não cobra hora).
      valorHora: z
        .number('Informe um valor numérico.')
        .nonnegative('O valor em hora não pode ser negativo.')
        .max(99999, 'Valor em hora muito alto.')
        .optional(),
    })
    .superRefine((dados, ctx) => {
      if (dados.perfil === 'administrador') {
        return
      }

      if (dados.lojasIds.length === 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'Selecione ao menos uma loja.',
          path: ['lojasIds'],
        })
      }

      if (dados.perfil === 'solicitante') {
        if (dados.lojasIds.length > 1) {
          ctx.addIssue({
            code: 'custom',
            message: 'Solicitante deve ter apenas uma loja vinculada.',
            path: ['lojasIds'],
          })
        }

        if (dados.setoresIds.length !== 1) {
          ctx.addIssue({
            code: 'custom',
            message: 'Selecione o setor do solicitante.',
            path: ['setoresIds'],
          })
        }
      }

      if (
        dados.perfil === 'gestor' &&
        !dados.acessoTotalSetores &&
        dados.setoresIds.length === 0
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'Selecione ao menos um setor ou marque acesso total.',
          path: ['setoresIds'],
        })
      }

      if (dados.perfil === 'tecnico' && !dados.area) {
        ctx.addIssue({
          code: 'custom',
          message: 'Selecione a área de atuação.',
          path: ['area'],
        })
      }
    })

export type DadosCadastrarUsuario = z.infer<
  ReturnType<typeof criarEsquemaCadastrarUsuario>
>
