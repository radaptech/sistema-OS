-- ==========================================================================
-- Central de notificações do PWA -- substitui o WhatsApp (Evolution API).
--
-- Uma linha por DESTINATÁRIO, não por evento: "lida" é de cada um (dois
-- gestores do mesmo setor recebem a mesma solicitação nova e cada um marca a
-- sua). É também o que a contagem do sininho e o badge do ícone contam.
--
-- titulo/corpo são o texto pronto, gravado no momento do evento, e não
-- remontados na leitura: a notificação diz o que era verdade quando chegou
-- (a máquina pode ser renomeada depois, a solicitação pode já ter virado OS).
--
-- Sem FK pra solicitação/OS de propósito: o destino é a `url`, e
-- ExcluirMaquinaDefinitivo não precisa saber desta tabela. Notificação de
-- algo que sumiu só abre um "não encontrado".
-- ==========================================================================

-- Um valor por evento. Quem recebe cada um está em "Notificações", em
-- docs/fluxo-de-negocio.md.
CREATE TYPE tipo_notificacao AS ENUM (
    'solicitacao_nova',      -- Solicitante abriu      -> gestores do setor
    'solicitacao_aceita',    -- Gestor abriu a OS      -> Solicitante
    'solicitacao_rejeitada', -- Gestor rejeitou        -> Solicitante
    'os_aberta',             -- Gestor abriu a OS      -> Técnico designado
    'os_preventiva',         -- job abriu a OS         -> Técnico designado
    'os_concluida'           -- Técnico encerrou       -> gestores do setor
);

CREATE TABLE notificacao (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id   bigint NOT NULL REFERENCES empresa (id),
    usuario_id  bigint NOT NULL,
    tipo        tipo_notificacao NOT NULL,
    titulo      text NOT NULL,
    corpo       text NOT NULL,
    url         text NOT NULL,
    lida_em     timestamptz,
    criado_em   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_notificacao_usuario
        FOREIGN KEY (tenant_id, usuario_id) REFERENCES usuario (tenant_id, id),
    -- Caminho relativo à origem do próprio tenant ("/painel-gestor?..."). O
    -- service worker abre essa url ao tocar no push: "//outro.site" ou
    -- "https://..." viraria um redirecionamento pra fora do sistema.
    CONSTRAINT ck_notificacao_url CHECK (url ~ '^/[^/\\]')
);

-- A lista do sininho: as do usuário, mais novas primeiro.
CREATE INDEX idx_notificacao_usuario ON notificacao (tenant_id, usuario_id, criado_em DESC);
-- A contagem de não lidas roda a cada foco de janela/push; parcial porque a
-- imensa maioria das linhas já foi lida.
CREATE INDEX idx_notificacao_nao_lida ON notificacao (tenant_id, usuario_id) WHERE lida_em IS NULL;
