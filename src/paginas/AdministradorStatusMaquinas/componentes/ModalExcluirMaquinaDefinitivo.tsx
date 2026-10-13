import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Trash2, XCircle } from 'lucide-react'
import { Botao } from '../../../componentes/Botao'
import { CampoTexto } from '../../../componentes/CampoTexto'
import { useSaidaAnimada } from '../../../hooks/useSaidaAnimada'
import { servicoMaquinas } from '../../../servicos/servicoMaquinas'
import type { Maquina } from '../../../tipos/maquina'

interface ModalExcluirMaquinaDefinitivoProps {
  maquina: Maquina
  aoConfirmar: (senha: string, confirmacao: string) => void
  aoFechar: () => void
  confirmando?: boolean
}

// Exclusão física, a única do sistema: leva junto solicitações, OS, custos e notas
// fiscais. Por isso pede o patrimônio digitado e a senha de quem está logado. O botão só
// libera com o patrimônio igual, mas quem confere de verdade (os dois) é o servidor.
export function ModalExcluirMaquinaDefinitivo({
  maquina,
  aoConfirmar,
  aoFechar,
  confirmando = false,
}: ModalExcluirMaquinaDefinitivoProps) {
  const { fechar, classeFundo, classeCartao } = useSaidaAnimada(aoFechar)
  const [confirmacao, setConfirmacao] = useState('')
  const [senha, setSenha] = useState('')

  const { data: historico } = useQuery({
    queryKey: ['maquinas', maquina.id, 'historico'],
    // Formulário/confirmação: sempre o registro atual, nunca o do cache (o padrão
    // de 30s do App.tsx reabriria a edição com o valor de antes de salvar).
    staleTime: 0,
    queryFn: () => servicoMaquinas.historico(maquina.id),
  })

  const patrimonio = maquina.numeroPatrimonio ?? ''
  const liberado = confirmacao.trim() === patrimonio && senha.length > 0

  return createPortal(
    <div className={`${classeFundo} fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm`}>
      <div className={`${classeCartao} w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-pop`}>
        <div className="flex items-start justify-between bg-red-600 px-6 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-white" size={20} />
            <p className="font-display text-lg font-bold text-white">Excluir definitivamente</p>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={fechar}
            className="text-white/90 transition hover:text-white"
          >
            <XCircle size={22} />
          </button>
        </div>

        <form
          className="flex flex-col gap-4 p-6"
          onSubmit={(evento) => {
            evento.preventDefault()
            if (liberado) {
              aoConfirmar(senha, confirmacao)
            }
          }}
        >
          <p className="text-sm text-slate-600">
            <strong>{maquina.nome}</strong> será apagada do banco junto com todo o histórico
            dela. <strong>Não há como desfazer.</strong>
          </p>

          <ul className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {historico ? (
              <>
                <li>{historico.solicitacoes} solicitação(ões)</li>
                <li>{historico.ordensServico} ordem(ns) de serviço, com custos e pausas</li>
                <li>{historico.notasFiscais} nota(s) fiscal(is)</li>
                <li>{historico.preventivas} preventiva(s)</li>
              </>
            ) : (
              <li>Contando o histórico...</li>
            )}
          </ul>

          <CampoTexto
            rotulo={`Digite o patrimônio "${patrimonio}" para confirmar`}
            name="confirmacao"
            autoComplete="off"
            value={confirmacao}
            onChange={(evento) => setConfirmacao(evento.target.value)}
          />

          <CampoTexto
            rotulo="Sua senha"
            name="senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
          />

          <div className="flex gap-3">
            <div className="flex-1">
              <Botao type="button" variante="secundario" onClick={fechar}>
                Cancelar
              </Botao>
            </div>
            <div className="flex-1">
              <Botao
                type="submit"
                variante="perigo"
                disabled={!liberado}
                carregando={confirmando}
                rotuloCarregando="Excluindo..."
              >
                <Trash2 size={16} />
                Excluir
              </Botao>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
