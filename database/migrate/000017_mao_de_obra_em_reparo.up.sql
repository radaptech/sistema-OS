-- ==========================================================================
-- Pequenos Reparos passam a ter mão de obra: todo tipo de OS lança, por
-- tarefa, Descrição + Valor Peças + Valor Mão de Obra.
--
-- A 000016 liberou a mão de obra em 'terceiros' e manteve 'reparo' de fora
-- com o argumento de que "o serviço é pequeno demais para ser cobrado à
-- parte". Na prática o Técnico também gasta hora em reparo, e a tela passou a
-- pedir os mesmos três campos em qualquer OS.
--
-- Nenhuma coluna nova, mesma razão da 000016: custo_hora_tecnico já é a mão
-- de obra da tarefa, e custo_total, vw_os_finalizada e os indicadores já a
-- somam. Reparos antigos continuam com NULL, que segue somando zero.
-- ==========================================================================

ALTER TABLE os_custo_item DROP CONSTRAINT ck_custo_item_hora_tecnico;

-- Só a metade da descrição do serviço terceiro sobrevive (000010).
ALTER TABLE os_custo DROP CONSTRAINT ck_custo_por_tipo;
ALTER TABLE os_custo ADD CONSTRAINT ck_custo_por_tipo CHECK (
    tipo = 'terceiros' OR descricao_servico_terceiro IS NULL);
