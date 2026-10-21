import type { PerfilLogin } from '../../tipos/autenticacao'
import type { Tecnico } from '../../tipos/tecnico'
import type { AtualizarUsuarioPayload, NovoUsuarioPayload, Usuario } from '../../tipos/usuario'
import { usuarios, type UsuarioInterno } from '../bancoMock'
import {
  atraso,
  gerarId,
  paginarLista,
  responderErro,
  responderJson,
  type Rota,
} from '../utilidadesMock'

// Usuario cobre solicitante/gestor/administrador — Técnico tem projeção própria em
// /tecnicos (ver rotasTecnicos abaixo), mas escreve pela mesma tabela interna.
function paraUsuarioPublico(usuario: UsuarioInterno): Usuario {
  return {
    id: usuario.id,
    nome: usuario.nome,
    telefone: usuario.telefone,
    email: usuario.email,
    perfil: usuario.perfil as Exclude<PerfilLogin, 'tecnico'>,
    lojasIds: usuario.lojasIds,
    setoresIds: usuario.setoresIds,
    acessoTotalSetores: usuario.acessoTotalSetores,
    ativo: usuario.ativo,
    area: usuario.perfil === 'tecnico' ? usuario.area : undefined,
    valorHora: usuario.valorHora,
  }
}

function paraTecnicoPublico(usuario: UsuarioInterno): Tecnico {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    telefone: usuario.telefone,
    area: usuario.area ?? 'Máquinas em Geral',
    lojasIds: usuario.lojasIds,
    valorHora: usuario.valorHora,
  }
}

export const rotasUsuarios: Rota[] = [
  {
    metodo: 'GET',
    padrao: /^\/usuarios$/,
    async tratar({ query }) {
      await atraso()
      let lista = usuarios.filter((usuario) => usuario.perfil !== 'tecnico' && usuario.ativo)

      const perfil = query.get('perfil')
      if (perfil) {
        lista = lista.filter((usuario) => usuario.perfil === perfil)
      }

      const lojaId = query.get('lojaId')
      if (lojaId) {
        lista = lista.filter((usuario) => usuario.lojasIds.includes(Number(lojaId)))
      }

      const busca = query.get('busca')
      if (busca) {
        const termo = busca.toLowerCase()
        lista = lista.filter(
          (usuario) =>
            usuario.nome.toLowerCase().includes(termo) || usuario.email.toLowerCase().includes(termo),
        )
      }

      const pagina = Number(query.get('pagina') ?? '1')
      const resposta = paginarLista(lista, pagina, 10)

      return responderJson({ ...resposta, dados: resposta.dados.map(paraUsuarioPublico) })
    },
  },
  {
    metodo: 'GET',
    padrao: /^\/usuarios\/(\d+)$/,
    async tratar({ params }) {
      await atraso()
      const usuario = usuarios.find((item) => item.id === Number(params[0]))
      return usuario ? responderJson(paraUsuarioPublico(usuario)) : responderErro('Usuário não encontrado.', 404)
    },
  },
  {
    metodo: 'POST',
    padrao: /^\/usuarios$/,
    async tratar({ corpo }) {
      await atraso()
      const dados = corpo as NovoUsuarioPayload
      const emailDuplicado = usuarios.some(
        (usuario) => usuario.email.toLowerCase() === dados.email.toLowerCase(),
      )

      if (emailDuplicado) {
        return responderErro('Já existe um usuário com esse e-mail.', 409)
      }

      const novo: UsuarioInterno = {
        id: gerarId(usuarios),
        nome: dados.nome,
        email: dados.email,
        senha: dados.senha,
        telefone: dados.telefone,
        perfil: dados.perfil,
        lojasIds: dados.lojasIds,
        setoresIds: dados.setoresIds,
        acessoTotalSetores: dados.acessoTotalSetores,
        area: dados.area,
        // Como no servidor: tarifa só existe no perfil técnico.
        valorHora: dados.perfil === 'tecnico' ? dados.valorHora : undefined,
        ativo: true,
      }

      usuarios.push(novo)
      return responderJson(paraUsuarioPublico(novo), 201)
    },
  },
  {
    metodo: 'PUT',
    padrao: /^\/usuarios\/(\d+)$/,
    async tratar({ params, corpo }) {
      await atraso()
      const usuario = usuarios.find((item) => item.id === Number(params[0]))

      if (!usuario) {
        return responderErro('Usuário não encontrado.', 404)
      }

      const dados = corpo as AtualizarUsuarioPayload
      usuario.nome = dados.nome
      usuario.email = dados.email
      usuario.telefone = dados.telefone
      usuario.perfil = dados.perfil
      usuario.lojasIds = dados.lojasIds
      usuario.setoresIds = dados.setoresIds
      usuario.acessoTotalSetores = dados.acessoTotalSetores
      usuario.area = dados.area
      usuario.valorHora = dados.perfil === 'tecnico' ? dados.valorHora : undefined

      if (dados.senha) {
        usuario.senha = dados.senha
      }

      return responderJson(paraUsuarioPublico(usuario))
    },
  },
  {
    metodo: 'DELETE',
    padrao: /^\/usuarios\/(\d+)$/,
    async tratar({ params }) {
      await atraso()
      const indice = usuarios.findIndex((item) => item.id === Number(params[0]))

      if (indice === -1) {
        return responderErro('Usuário não encontrado.', 404)
      }

      usuarios.splice(indice, 1)
      return responderJson(null)
    },
  },
]

export const rotasTecnicos: Rota[] = [
  {
    metodo: 'GET',
    padrao: /^\/tecnicos$/,
    async tratar({ query }) {
      await atraso()
      let lista = usuarios.filter((usuario) => usuario.perfil === 'tecnico' && usuario.ativo)

      const lojaId = query.get('lojaId')
      if (lojaId) {
        lista = lista.filter((usuario) => usuario.lojasIds.includes(Number(lojaId)))
      }

      return responderJson(lista.map(paraTecnicoPublico))
    },
  },
  {
    metodo: 'GET',
    padrao: /^\/tecnicos\/(\d+)$/,
    async tratar({ params }) {
      await atraso()
      const tecnico = usuarios.find(
        (item) => item.id === Number(params[0]) && item.perfil === 'tecnico',
      )
      return tecnico ? responderJson(paraTecnicoPublico(tecnico)) : responderErro('Técnico não encontrado.', 404)
    },
  },
]
