ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS em_manutencao boolean NOT NULL DEFAULT false;
