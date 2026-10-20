-- ==========================================================================
-- Linha do tempo da OS (migration 000021): quem fez cada passo e quando.
-- Escrita sempre DENTRO da transação do passo que registra -- evento e
-- mudança de estado commitam juntos ou nenhum dos dois.
-- ==========================================================================

-- name: CriarEventoOS :exec
-- usuario_id é narg só pela OS de preventiva (ninguém abriu, foi o
-- calendário); ck_os_evento_usuario recusa NULL em qualquer outro tipo.
-- status_* são nulos nos eventos que não mudam o estado (terceiro_acionado,
-- custo_corrigido). detalhes é o JSON do passo (motivo da pausa, estado do
-- custo...), sempre objeto -- ver ck_os_evento_detalhes.
INSERT INTO os_evento (
    tenant_id, ordem_servico_id, tipo, usuario_id, status_anterior, status_novo, detalhes
) VALUES (
    sqlc.arg(tenant_id), sqlc.arg(ordem_servico_id), sqlc.arg(tipo), sqlc.narg(usuario_id),
    sqlc.narg(status_anterior), sqlc.narg(status_novo), sqlc.narg(detalhes)
);

-- name: ListarEventosDaOS :many
-- A linha do tempo de UMA OS, do mais antigo para o mais novo (é assim que a
-- tela conta a história). `id` desempata eventos no mesmo instante: o now()
-- de uma transação é um só, e aberta+... nunca nascem juntos, mas uma
-- correção e outra em sequência rápida sim.
--
-- Nome do autor por JOIN (usuario.nome de hoje): quem renomear o usuário
-- renomeia a história, e isso é o esperado -- é a pessoa, não um carimbo.
-- Perfil vem junto para a tela dizer "Administrador" ao lado do nome.
--
-- Sem escopo aqui: quem chama (OrdemServicoService.ListarHistorico) já provou
-- que a OS está ao alcance do ator.
SELECT
    ev.id,
    ev.tipo,
    ev.usuario_id,
    u.nome   AS usuario_nome,
    u.perfil AS usuario_perfil,
    ev.status_anterior,
    ev.status_novo,
    ev.detalhes,
    ev.ocorrido_em
FROM os_evento ev
LEFT JOIN usuario u ON u.tenant_id = ev.tenant_id AND u.id = ev.usuario_id
WHERE ev.tenant_id = sqlc.arg(tenant_id) AND ev.ordem_servico_id = sqlc.arg(ordem_servico_id)
ORDER BY ev.ocorrido_em, ev.id;

-- name: ObterOrdemServicoNoEscopo :one
-- "Esta OS está ao meu alcance?" para a leitura da linha do tempo. Mesmo
-- critério da listagem, em três perfis:
--   - administrador (escopo NULL): qualquer OS do tenant;
--   - gestor: o EXISTS de escopo sobre o setor da SOLICITAÇÃO de origem;
--   - técnico: só a que é dele (tecnico_id).
-- Fora disso é pgx.ErrNoRows -> 404, nunca 403, mesmo critério de
-- ObterSolicitacaoPorID: não confirma que o id existe.
SELECT os.id
FROM ordem_servico os
JOIN solicitacao_os s ON s.tenant_id = os.tenant_id AND s.id = os.solicitacao_id
JOIN setor st         ON st.tenant_id = s.tenant_id AND st.id = s.setor_id
WHERE os.tenant_id = sqlc.arg(tenant_id)
  AND os.id = sqlc.arg(id)
  AND (
    sqlc.arg(perfil)::text = 'administrador'
    OR (sqlc.arg(perfil)::text = 'tecnico' AND os.tecnico_id = sqlc.arg(usuario_id))
    OR (
      sqlc.arg(perfil)::text = 'gestor'
      AND EXISTS (
        SELECT 1
        FROM usuario_escopo ue
        LEFT JOIN usuario_escopo_setor ues ON ues.escopo_id = ue.id
        WHERE ue.usuario_id = sqlc.arg(usuario_id)
          AND ue.loja_id = st.loja_id
          AND (ue.acesso_total_setores OR ues.setor_id = s.setor_id)
      )
    )
  );
