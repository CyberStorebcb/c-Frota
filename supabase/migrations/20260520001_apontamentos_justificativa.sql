-- Adiciona colunas de justificativa para apontamentos não resolvidos
ALTER TABLE apontamentos
  ADD COLUMN IF NOT EXISTS justificado        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS justificativa      text,
  ADD COLUMN IF NOT EXISTS justificativa_data date,
  ADD COLUMN IF NOT EXISTS justificativa_imagem text;
