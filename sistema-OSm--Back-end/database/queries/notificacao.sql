-- name: CriarNotificacoes :many
-- Uma linha por destinatário, numa ida só ao banco (unnest): "solicitação
-- nova" vai pra todo gestor do setor, e N INSERTs seriam N idas. O texto é o
-- mesmo pra todos -- quem difere é só o usuario_id. Usuário de outro tenant
-- não entra: a FK composta (tenant_id, usuario_id) recusa a linha inteira.
--
-- Devolve o id de cada uma: vai no push, pro service worker marcar como lida
-- a notificação certa quando o usuário toca nela.
INSERT INTO notificacao (tenant_id, usuario_id, tipo, titulo, corpo, url)
SELECT sqlc.arg(tenant_id), u.id, sqlc.arg(tipo), sqlc.arg(titulo), sqlc.arg(corpo), sqlc.arg(url)
FROM unnest(sqlc.arg(usuario_ids)::bigint[]) AS u(id)
RETURNING id, usuario_id;

-- name: ListarNotificacoesDoUsuario :many
-- GET /notificacoes -- sempre só as do próprio usuário (o id vem do token),
-- mais novas primeiro, paginada por LIMIT/OFFSET pelo mesmo motivo de
-- ListarSolicitacoesDoSolicitante: model.RespostaPaginada pede os dois números.
SELECT id, tipo, titulo, corpo, url, lida_em, criado_em
FROM notificacao
WHERE tenant_id = sqlc.arg(tenant_id)
  AND usuario_id = sqlc.arg(usuario_id)
ORDER BY criado_em DESC, id DESC
LIMIT sqlc.arg(limite) OFFSET sqlc.arg(deslocamento);

-- name: ContarNotificacoesDoUsuario :one
-- Mesmo WHERE de ListarNotificacoesDoUsuario -- divergir dá total que não bate
-- com a página.
SELECT count(*)
FROM notificacao
WHERE tenant_id = sqlc.arg(tenant_id)
  AND usuario_id = sqlc.arg(usuario_id);

-- name: ContarNotificacoesNaoLidas :one
-- O número do sininho e do badge do ícone (idx_notificacao_nao_lida).
SELECT count(*)
FROM notificacao
WHERE tenant_id = sqlc.arg(tenant_id)
  AND usuario_id = sqlc.arg(usuario_id)
  AND lida_em IS NULL;

-- name: MarcarNotificacaoComoLida :execrows
-- :execrows pelo mesmo motivo das queries de desativar: notificação de outro
-- usuário (ou inexistente) conta 0 e vira 404, em vez de responder sucesso
-- sem ter feito nada. COALESCE e não "WHERE lida_em IS NULL": marcar de novo
-- casa a linha e conta 1 (idempotente, como o front espera) e não reescreve
-- a hora da primeira leitura.
UPDATE notificacao
SET lida_em = COALESCE(lida_em, now())
WHERE id = sqlc.arg(id)
  AND tenant_id = sqlc.arg(tenant_id)
  AND usuario_id = sqlc.arg(usuario_id);

-- name: MarcarTodasNotificacoesComoLidas :exec
-- "Marcar todas como lidas" -- zero linhas é sucesso (já estava tudo lido).
UPDATE notificacao
SET lida_em = now()
WHERE tenant_id = sqlc.arg(tenant_id)
  AND usuario_id = sqlc.arg(usuario_id)
  AND lida_em IS NULL;

-- name: ContarNaoLidasDosUsuarios :many
-- O número do badge de cada destinatário de um push, numa ida só -- cada um
-- tem a sua contagem. Usuário sem nenhuma não lida não volta linha (é zero).
SELECT usuario_id, count(*) AS total
FROM notificacao
WHERE tenant_id = sqlc.arg(tenant_id)
  AND usuario_id = ANY(sqlc.arg(usuario_ids)::bigint[])
  AND lida_em IS NULL
GROUP BY usuario_id;
