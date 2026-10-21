import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { CarregandoRota } from '../componentes/CarregandoRota'
import { RotaProtegida } from './RotaProtegida'
import { RotaPublica } from './RotaPublica'

// Cada tela vira um pedaço próprio do bundle, baixado só quando a rota é acessada. Sem
// isso, um Solicitante que só usa duas telas baixaria também todo o painel do
// Administrador na primeira visita. O Login fica junto do bundle inicial de propósito —
// é a primeira tela de todo mundo, e adiar o carregamento dele só atrasaria o começo.
import { TelaLogin } from '../paginas/TelaLogin/TelaLogin'

const EsqueciSenha = lazy(() =>
  import('../paginas/EsqueciSenha/EsqueciSenha').then((m) => ({
    default: m.EsqueciSenha,
  })),
)
const RedefinirSenha = lazy(() =>
  import('../paginas/RedefinirSenha/RedefinirSenha').then((m) => ({
    default: m.RedefinirSenha,
  })),
)
const HomeSolicitante = lazy(() =>
  import('../paginas/HomeSolicitante/HomeSolicitante').then((m) => ({
    default: m.HomeSolicitante,
  })),
)
const AbrirOSDireta = lazy(() =>
  import('../paginas/AbrirOSDireta/AbrirOSDireta').then((m) => ({
    default: m.AbrirOSDireta,
  })),
)
const NovaSolicitacao = lazy(() =>
  import('../paginas/NovaSolicitacao/NovaSolicitacao').then((m) => ({
    default: m.NovaSolicitacao,
  })),
)
const MinhasSolicitacoes = lazy(() =>
  import('../paginas/MinhasSolicitacoes/MinhasSolicitacoes').then((m) => ({
    default: m.MinhasSolicitacoes,
  })),
)
const PainelGestor = lazy(() =>
  import('../paginas/PainelGestor/PainelGestor').then((m) => ({
    default: m.PainelGestor,
  })),
)
const DashboardGestor = lazy(() =>
  import('../paginas/DashboardGestor/DashboardGestor').then((m) => ({
    default: m.DashboardGestor,
  })),
)
const PainelTecnico = lazy(() =>
  import('../paginas/PainelTecnico/PainelTecnico').then((m) => ({
    default: m.PainelTecnico,
  })),
)
const PainelAdministrador = lazy(() =>
  import('../paginas/PainelAdministrador/PainelAdministrador').then((m) => ({
    default: m.PainelAdministrador,
  })),
)
const AdministradorUsuarios = lazy(() =>
  import('../paginas/AdministradorUsuarios/AdministradorUsuarios').then(
    (m) => ({
      default: m.AdministradorUsuarios,
    }),
  ),
)
const AdministradorLojas = lazy(() =>
  import('../paginas/AdministradorLojas/AdministradorLojas').then((m) => ({
    default: m.AdministradorLojas,
  })),
)
const AdministradorSetores = lazy(() =>
  import('../paginas/AdministradorSetores/AdministradorSetores').then((m) => ({
    default: m.AdministradorSetores,
  })),
)
const AdministradorMaquinas = lazy(() =>
  import('../paginas/AdministradorMaquinas/AdministradorMaquinas').then(
    (m) => ({
      default: m.AdministradorMaquinas,
    }),
  ),
)
const AdministradorStatusMaquinas = lazy(() =>
  import('../paginas/AdministradorStatusMaquinas/AdministradorStatusMaquinas').then(
    (m) => ({ default: m.AdministradorStatusMaquinas }),
  ),
)
const AdministradorCustosPendentes = lazy(() =>
  import('../paginas/AdministradorCustosPendentes/AdministradorCustosPendentes').then(
    (m) => ({ default: m.AdministradorCustosPendentes }),
  ),
)
const AdministradorOSFinalizadas = lazy(() =>
  import('../paginas/AdministradorOSFinalizadas/AdministradorOSFinalizadas').then(
    (m) => ({
      default: m.AdministradorOSFinalizadas,
    }),
  ),
)
const AdministradorEmpresasTerceirizadas = lazy(() =>
  import('../paginas/AdministradorEmpresasTerceirizadas/AdministradorEmpresasTerceirizadas').then(
    (m) => ({ default: m.AdministradorEmpresasTerceirizadas }),
  ),
)
const CadastrarUsuario = lazy(() =>
  import('../paginas/CadastrarUsuario/CadastrarUsuario').then((m) => ({
    default: m.CadastrarUsuario,
  })),
)
const CadastrarSetor = lazy(() =>
  import('../paginas/CadastrarSetor/CadastrarSetor').then((m) => ({
    default: m.CadastrarSetor,
  })),
)
const CadastrarLoja = lazy(() =>
  import('../paginas/CadastrarLoja/CadastrarLoja').then((m) => ({
    default: m.CadastrarLoja,
  })),
)
const CadastrarMaquina = lazy(() =>
  import('../paginas/CadastrarMaquina/CadastrarMaquina').then((m) => ({
    default: m.CadastrarMaquina,
  })),
)
const CadastrarEmpresaTerceirizada = lazy(() =>
  import('../paginas/CadastrarEmpresaTerceirizada/CadastrarEmpresaTerceirizada').then(
    (m) => ({ default: m.CadastrarEmpresaTerceirizada }),
  ),
)

export function RotasPrincipais() {
  return (
    <Suspense fallback={<CarregandoRota />}>
      <Routes>
        <Route element={<RotaPublica />}>
          <Route path="/login" element={<TelaLogin />} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        </Route>

        {/* Fora da RotaPublica: quem está logado e abre o link do e-mail tem que conseguir trocar a senha, não ser jogado pro painel. */}
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />

        <Route element={<RotaProtegida perfis={['solicitante']} />}>
          <Route path="/home-solicitante" element={<HomeSolicitante />} />
          <Route path="/nova-solicitacao" element={<NovaSolicitacao />} />
          <Route path="/minhas-solicitacoes" element={<MinhasSolicitacoes />} />

          {/* As três telas viraram uma só. As rotas antigas continuam válidas como atalho,
              redirecionando com o tipo já selecionado, para não quebrar link salvo. */}
          <Route
            path="/nova-solicitacao-os"
            element={
              <Navigate to="/nova-solicitacao?tipo=maquinario" replace />
            }
          />
          <Route
            path="/nova-solicitacao-reparo"
            element={<Navigate to="/nova-solicitacao?tipo=reparo" replace />}
          />
          {/* Terceiros deixou de ser um tipo que o Solicitante abre: virou decisão do
              Técnico durante a execução. A rota antiga cai na tela padrão. */}
          <Route
            path="/nova-solicitacao-os-terceiros"
            element={<Navigate to="/nova-solicitacao" replace />}
          />
        </Route>

        <Route element={<RotaProtegida perfis={['tecnico']} />}>
          <Route path="/painel-tecnico" element={<PainelTecnico />} />
        </Route>

        <Route element={<RotaProtegida perfis={['gestor']} />}>
          <Route path="/painel-gestor" element={<PainelGestor />} />
          <Route path="/dashboard-gestor" element={<DashboardGestor />} />
        </Route>

        <Route element={<RotaProtegida perfis={['gestor', 'administrador']} />}>
          <Route path="/abrir-os-direta" element={<AbrirOSDireta />} />
        </Route>

        <Route element={<RotaProtegida perfis={['administrador']} />}>
          <Route
            path="/painel-administrador"
            element={<PainelAdministrador />}
          />

          <Route
            path="/administrador/usuarios"
            element={<AdministradorUsuarios />}
          />
          <Route path="/cadastrar-usuario" element={<CadastrarUsuario />} />
          <Route path="/cadastrar-usuario/:id" element={<CadastrarUsuario />} />

          <Route path="/administrador/lojas" element={<AdministradorLojas />} />
          <Route path="/cadastrar-loja" element={<CadastrarLoja />} />
          <Route path="/cadastrar-loja/:id" element={<CadastrarLoja />} />

          <Route
            path="/administrador/setores"
            element={<AdministradorSetores />}
          />
          <Route path="/cadastrar-setor" element={<CadastrarSetor />} />
          <Route path="/cadastrar-setor/:id" element={<CadastrarSetor />} />

          <Route
            path="/administrador/maquinas"
            element={<AdministradorMaquinas />}
          />
          <Route
            path="/administrador/maquinas/status"
            element={<AdministradorStatusMaquinas />}
          />
          <Route path="/cadastrar-maquina" element={<CadastrarMaquina />} />
          <Route path="/cadastrar-maquina/:id" element={<CadastrarMaquina />} />

          <Route
            path="/administrador/custos-pendentes"
            element={<AdministradorCustosPendentes />}
          />
          <Route
            path="/administrador/os-finalizadas"
            element={<AdministradorOSFinalizadas />}
          />

          <Route
            path="/administrador/empresas-terceirizadas"
            element={<AdministradorEmpresasTerceirizadas />}
          />
          <Route
            path="/cadastrar-empresa-terceirizada"
            element={<CadastrarEmpresaTerceirizada />}
          />
          <Route
            path="/cadastrar-empresa-terceirizada/:id"
            element={<CadastrarEmpresaTerceirizada />}
          />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )
}
