-- name: SalvarDispositivoPush :exec
-- POST /push/inscricoes. Upsert pelo endpoint: o mesmo navegador inscrevendo de
-- novo (renovou a inscrição, ou OUTRO usuário logou no mesmo aparelho) atualiza
-- a linha e troca o dono, em vez de duplicar ou recusar. Ver o cabeçalho da
-- migration 000019.
INSERT INTO dispositivo_push (tenant_id, usuario_id, endpoint, p256dh, auth, user_agent)
VALUES (sqlc.arg(tenant_id), sqlc.arg(usuario_id), sqlc.arg(endpoint), sqlc.arg(p256dh), sqlc.arg(auth), sqlc.narg(user_agent))
ON CONFLICT (endpoint) DO UPDATE SET
    tenant_id     = EXCLUDED.tenant_id,
    usuario_id    = EXCLUDED.usuario_id,
    p256dh        = EXCLUDED.p256dh,
    auth          = EXCLUDED.auth,
    user_agent    = EXCLUDED.user_agent,
    atualizado_em = now();

-- name: RemoverDispositivoPushDoUsuario :exec
-- POST /push/inscricoes/remover (o front chama no logout e ao desativar). Só
-- apaga se o endpoint é do próprio usuário: ninguém desinscreve o aparelho de
-- outro mandando o endpoint dele. :exec e não :execrows -- zero linhas é
-- sucesso: o logout de um aparelho cuja inscrição já morreu (410) não é erro.
DELETE FROM dispositivo_push
WHERE endpoint = sqlc.arg(endpoint)
  AND tenant_id = sqlc.arg(tenant_id)
  AND usuario_id = sqlc.arg(usuario_id);

-- name: RemoverDispositivoPush :exec
-- O serviço de push respondeu 404/410: a inscrição morreu (app desinstalado,
-- permissão revogada, navegador limpo). Por id, sem dono -- quem chama é o
-- próprio servidor, com a linha que acabou de ler.
DELETE FROM dispositivo_push WHERE id = sqlc.arg(id);

-- name: ListarDispositivosPushDosUsuarios :many
-- Todos os aparelhos dos destinatários de um evento, numa ida só.
SELECT id, usuario_id, endpoint, p256dh, auth
FROM dispositivo_push
WHERE tenant_id = sqlc.arg(tenant_id)
  AND usuario_id = ANY(sqlc.arg(usuario_ids)::bigint[]);
