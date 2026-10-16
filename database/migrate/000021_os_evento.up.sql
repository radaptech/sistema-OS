-- ==========================================================================
-- Linha do tempo da OS: quem fez cada passo e quando (os_evento).
--
-- Até aqui só se sabia QUANDO (iniciada_em, pausada_em/retomada_em) e, no
-- encerramento e no último lançamento de custo, quem. Iniciar/pausar/retomar
-- eram autoria INFERIDA (tecnico_id é fixo na OS) e a correção de custo do
-- Administrador sobrescrevia a itemização do Técnico sem deixar rastro
-- (pontos 2, 4 e 7 da seção 6 de docs/modelagem-banco-dados.md).
--
-- Uma tabela só, append-only, cobre os dois: um evento por passo do ciclo de
-- vida. Nos dois eventos que mexem em dinheiro (encerrada e custo_corrigido)
-- `detalhes` carrega o ESTADO DO CUSTO DEPOIS do passo (itens, notas, totais);
-- a versão anterior de qualquer correção é o evento que veio antes dele.
-- Guardar o "depois" e não o "antes" deixa a história inteira legível sem
-- precisar de um evento extra para o lançamento original.
--
-- os_pausa continua sendo a fonte das horas (vw_os_horas); os_evento é a
-- auditoria, não substitui o cálculo.
--
-- Append-only de verdade: trg_os_evento_imutavel recusa UPDATE. DELETE fica
-- liberado só porque POST /maquinas/:id/excluir apaga a máquina com todo o
-- histórico (ExcluirMaquinaDefinitivo).
-- ==========================================================================

CREATE TYPE tipo_evento_os AS ENUM (
    'aberta',
    'iniciada',
    'pausada',
    'retomada',
    'terceiro_acionado',
    'encerrada',
    'custo_corrigido'
);

CREATE TABLE os_evento (
    id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id         bigint NOT NULL REFERENCES empresa (id),
    ordem_servico_id  bigint NOT NULL,
    tipo              tipo_evento_os NOT NULL,
    -- NULL só na OS aberta pelo job de preventiva (ninguém abriu, foi o
    -- calendário) -- mesmo critério de ordem_servico.aberta_por_id (000008).
    usuario_id        bigint,
    status_anterior   status_os,
    status_novo       status_os,
    detalhes          jsonb,
    ocorrido_em       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_os_evento_os
        FOREIGN KEY (tenant_id, ordem_servico_id) REFERENCES ordem_servico (tenant_id, id),
    CONSTRAINT fk_os_evento_usuario
        FOREIGN KEY (tenant_id, usuario_id) REFERENCES usuario (tenant_id, id),
    CONSTRAINT ck_os_evento_detalhes CHECK (detalhes IS NULL OR jsonb_typeof(detalhes) = 'object'),
    -- Só 'aberta' pode não ter autor.
    CONSTRAINT ck_os_evento_usuario CHECK (usuario_id IS NOT NULL OR tipo = 'aberta')
);

-- A leitura é sempre "a linha do tempo desta OS".
CREATE INDEX idx_os_evento_os ON os_evento (tenant_id, ordem_servico_id, ocorrido_em, id);

CREATE FUNCTION fn_os_evento_imutavel() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'os_evento é append-only: não se altera um evento já gravado';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_os_evento_imutavel
    BEFORE UPDATE ON os_evento
    FOR EACH ROW EXECUTE FUNCTION fn_os_evento_imutavel();

-- --------------------------------------------------------------------------
-- Retroativo: as OS que já existem ganham a linha do tempo que dá para
-- reconstituir. O que veio de coluna com autor gravado (abertura, encerramento)
-- é fato; o que veio do tecnico_id fixo (iniciada, pausa, retomada, terceiro)
-- é INFERÊNCIA -- por isso todas levam {"retroativo": true}, e a tela diz isso.
-- Correção de custo antiga não tem como ser reconstituída: ficou só o último
-- estado, e não se inventa evento.
-- --------------------------------------------------------------------------
INSERT INTO os_evento (tenant_id, ordem_servico_id, tipo, usuario_id, status_novo, detalhes, ocorrido_em)
SELECT os.tenant_id, os.id, 'aberta', os.aberta_por_id, 'Aberta',
       jsonb_build_object('retroativo', true, 'tecnicoId', os.tecnico_id, 'urgencia', os.urgencia), os.aberta_em
FROM ordem_servico os;

INSERT INTO os_evento (tenant_id, ordem_servico_id, tipo, usuario_id, status_anterior, status_novo, detalhes, ocorrido_em)
SELECT os.tenant_id, os.id, 'iniciada', os.tecnico_id, 'Aberta', 'Em Andamento',
       jsonb_build_object('retroativo', true), os.iniciada_em
FROM ordem_servico os
WHERE os.iniciada_em IS NOT NULL;

INSERT INTO os_evento (tenant_id, ordem_servico_id, tipo, usuario_id, status_anterior, status_novo, detalhes, ocorrido_em)
SELECT os.tenant_id, os.id, 'pausada', os.tecnico_id, p.status_anterior, 'Pausada',
       jsonb_build_object('retroativo', true, 'motivo', p.motivo), p.pausada_em
FROM os_pausa p
JOIN ordem_servico os ON os.id = p.ordem_servico_id;

INSERT INTO os_evento (tenant_id, ordem_servico_id, tipo, usuario_id, status_anterior, status_novo, detalhes, ocorrido_em)
SELECT os.tenant_id, os.id, 'retomada', os.tecnico_id, 'Pausada', p.status_anterior,
       jsonb_build_object('retroativo', true), p.retomada_em
FROM os_pausa p
JOIN ordem_servico os ON os.id = p.ordem_servico_id
WHERE p.retomada_em IS NOT NULL;

INSERT INTO os_evento (tenant_id, ordem_servico_id, tipo, usuario_id, detalhes, ocorrido_em)
SELECT os.tenant_id, os.id, 'terceiro_acionado', os.tecnico_id,
       jsonb_build_object('retroativo', true, 'empresaTerceirizadaId', os.empresa_terceirizada_id,
                          'empresaTerceirizadaNome', et.nome),
       os.terceiro_acionado_em
FROM ordem_servico os
JOIN empresa_terceirizada et ON et.tenant_id = os.tenant_id AND et.id = os.empresa_terceirizada_id
WHERE os.terceiro_acionado_em IS NOT NULL;

INSERT INTO os_evento (tenant_id, ordem_servico_id, tipo, usuario_id, status_anterior, status_novo, detalhes, ocorrido_em)
SELECT e.tenant_id, e.ordem_servico_id, 'encerrada', e.encerrado_por_id, 'Em Andamento', 'Concluída',
       jsonb_build_object('retroativo', true, 'tipoDefeito', e.tipo_defeito), e.data_fim
FROM os_encerramento e;
