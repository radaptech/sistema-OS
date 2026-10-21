-- ==========================================================================
-- Foto de loja, setor e empresa terceirizada.
--
-- Mesmo modelo da foto da máquina (000003): a coluna guarda a CHAVE do objeto
-- no R2, nunca uma URL -- a leitura é assinada na hora. Cada entidade tem o
-- próprio bucket (R2_BUCKET_NAME_IMG_LOJAS / _IMG_SETORES /
-- _IMG_TERCERIZADOS), escolhido no wiring do router; não há coluna `bucket`.
--
-- Nullable e sem default: foto é opcional nos três cadastros, e as linhas que
-- já existem simplesmente ficam sem foto até alguém editar.
-- ==========================================================================

ALTER TABLE loja ADD COLUMN foto_chave text;
ALTER TABLE setor ADD COLUMN foto_chave text;
ALTER TABLE empresa_terceirizada ADD COLUMN foto_chave text;
