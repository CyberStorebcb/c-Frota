-- Adiciona colunas setor, processo e proprietario à tabela vehicles
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS setor        text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS processo     text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proprietario text NOT NULL DEFAULT '';
