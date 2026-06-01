-- Adiciona coluna para registrar quem resolveu o apontamento
ALTER TABLE apontamentos ADD COLUMN IF NOT EXISTS resolvido_por text;
