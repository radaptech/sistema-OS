import { Alternador } from '../../../componentes/Alternador'
import { CampoSelecao } from '../../../componentes/CampoSelecao'
import { SeletorMultiplo } from '../../../componentes/SeletorMultiplo'
import { useLojas } from '../../../hooks/useLojas'
import { useSetores } from '../../../hooks/useSetores'
import { areasTecnico, type AreaTecnico } from '../../../tipos/tecnico'
import type { PerfilLogin } from '../../../tipos/autenticacao'

interface CamposAcessoProps {
  perfil: PerfilLogin
  lojasIds: number[]
  setoresIds: number[]
  acessoTotalSetores: boolean
  area?: AreaTecnico
  aoAlterarLojas: (lojas: number[]) => void
  aoAlterarSetores: (setoresIds: number[]) => void
  aoAlternarAcessoTotal: (valor: boolean) => void
  aoAlterarArea: (area: string) => void
  erroLojas?: string
  erroSetores?: string
  erroArea?: string
  className?: string
}

export function CamposAcesso({
  perfil,
  lojasIds,
  setoresIds,
  acessoTotalSetores,
  area,
  aoAlterarLojas,
  aoAlterarSetores,
  aoAlternarAcessoTotal,
  aoAlterarArea,
  erroLojas,
  erroSetores,
  erroArea,
  className = '',
}: CamposAcessoProps) {
  const { data: lojas = [] } = useLojas()
  const { data: setores = [] } = useSetores()
  const opcoesLojas = lojas.map((loja) => ({ valor: loja.id, rotulo: loja.nome }))

  // Setor pertence a uma loja: só faz sentido oferecer os setores das lojas marcadas.
  // Com mais de uma loja selecionada, o nome da loja entra no rótulo porque setores
  // homônimos em lojas diferentes são registros distintos.
  const setoresDasLojas = setores.filter((setor) => lojasIds.includes(setor.lojaId))
  const opcoesSetores = setoresDasLojas.map((setor) => ({
    valor: setor.id,
    rotulo:
      lojasIds.length > 1
        ? `${setor.nome} · ${lojas.find((loja) => loja.id === setor.lojaId)?.nome ?? ''}`
        : setor.nome,
  }))

  if (perfil === 'administrador') {
    return (
      <p className={`rounded-xl border border-slate-200/60 bg-slate-50 px-4 py-3 text-sm text-slate-600 ${className}`}>
        Administrador tem acesso total ao tenant, sem restrição de loja ou setor.
      </p>
    )
  }

  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-xs font-semibold tracking-wider text-marca-500 uppercase">
          Loja(s) * {perfil !== 'solicitante' && '(seleção múltipla)'}
        </span>
        <SeletorMultiplo
          opcoes={opcoesLojas}
          selecionados={lojasIds}
          selecaoUnica={perfil === 'solicitante'}
          aoAlterar={(novasLojas) => {
            aoAlterarLojas(novasLojas)
            // Desmarcar uma loja deixaria selecionados setores que não pertencem mais a
            // nenhuma loja do usuário.
            aoAlterarSetores(
              setoresIds.filter((setorId) =>
                setores.some(
                  (setor) => setor.id === setorId && novasLojas.includes(setor.lojaId),
                ),
              ),
            )
          }}
        />
        {erroLojas && <span className="text-xs text-red-500">{erroLojas}</span>}
      </div>

      {perfil !== 'tecnico' && (
        <div className="flex flex-col gap-3">
          <span className="font-mono text-xs font-semibold tracking-wider text-marca-500 uppercase">
            Setor(es) * {perfil === 'gestor' && '(seleção múltipla)'}
          </span>

          {perfil === 'gestor' && (
            <Alternador
              marcado={acessoTotalSetores}
              aoAlternar={aoAlternarAcessoTotal}
              rotulo="Acesso total aos setores"
              descricao="Concede acesso a todos os setores das lojas selecionadas"
            />
          )}

          {!(perfil === 'gestor' && acessoTotalSetores) && (
            <>
              {lojasIds.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Selecione ao menos uma loja para escolher os setores.
                </p>
              ) : (
                <SeletorMultiplo
                  opcoes={opcoesSetores}
                  selecionados={setoresIds}
                  selecaoUnica={perfil === 'solicitante'}
                  aoAlterar={aoAlterarSetores}
                />
              )}
              {erroSetores && <span className="text-xs text-red-500">{erroSetores}</span>}
            </>
          )}
        </div>
      )}

      {perfil === 'tecnico' && (
        <CampoSelecao
          rotulo="Área de Atuação *"
          value={area ?? ''}
          onChange={(evento) => aoAlterarArea(evento.target.value)}
          mensagemErro={erroArea}
        >
          <option value="">Selecionar...</option>
          {areasTecnico.map((areaDisponivel) => (
            <option key={areaDisponivel} value={areaDisponivel}>
              {areaDisponivel}
            </option>
          ))}
        </CampoSelecao>
      )}
    </div>
  )
}
