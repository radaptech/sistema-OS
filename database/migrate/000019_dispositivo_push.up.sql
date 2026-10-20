-- ==========================================================================
-- Web Push: um navegador/aparelho inscrito pra receber push de um usuário.
--
-- A inscrição é o que o navegador devolve em pushManager.subscribe(): o
-- `endpoint` (a URL do serviço de push do fabricante -- Google, Mozilla, Apple,
-- Microsoft -- que identifica AQUELE navegador naquele aparelho) e as duas
-- chaves com que o servidor cifra a mensagem (p256dh, auth).
--
-- Um usuário pode ter vários (celular + computador). Um endpoint é de um
-- usuário só por vez: o mesmo celular usado por outra pessoa depois do logout
-- re-inscreve e a linha MUDA de dono (UNIQUE + upsert em SalvarDispositivoPush),
-- em vez de o aparelho seguir recebendo aviso dos dois.
--
-- Hard delete (exceção ao soft delete, como os_custo_item): inscrição não é
-- entidade com histórico, é um endereço. Morre no logout, quando o serviço de
-- push responde 404/410 (desinstalou, revogou a permissão) ou é trocada.
-- ==========================================================================

CREATE TABLE dispositivo_push (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id     bigint NOT NULL REFERENCES empresa (id),
    usuario_id    bigint NOT NULL,
    endpoint      text NOT NULL,
    p256dh        text NOT NULL,
    auth          text NOT NULL,
    -- Só pra um humano reconhecer o aparelho no banco ("Chrome no Android");
    -- nada decide em cima dele.
    user_agent    text,
    criado_em     timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_dispositivo_push_usuario
        FOREIGN KEY (tenant_id, usuario_id) REFERENCES usuario (tenant_id, id),
    CONSTRAINT uq_dispositivo_push_endpoint UNIQUE (endpoint),
    -- O servidor faz POST nessa URL: sem isto, um usuário logado registraria
    -- "http://servico-interno/..." e usaria a API como proxy (SSRF). A lista de
    -- hosts permitidos fica no service (validarInscricao); aqui é a rede de
    -- baixo -- HTTPS sempre, e tamanho limitado.
    CONSTRAINT ck_dispositivo_push_endpoint CHECK (endpoint ~ '^https://' AND length(endpoint) <= 2048)
);

-- Quem entregar() procura: todos os aparelhos dos destinatários de um evento.
CREATE INDEX idx_dispositivo_push_usuario ON dispositivo_push (tenant_id, usuario_id);
