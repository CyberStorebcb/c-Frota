-- Sub-motivo para NÃO RODOU (Folga, Feriado, Sem operador, Outro)
-- e para OFICINA (Preventiva, Corretiva, Revisão).
-- Coluna obs guarda o detalhe sem quebrar o tipo principal.

ALTER TABLE public.checklist_ausencia_justificativas
  ADD COLUMN IF NOT EXISTS obs text NOT NULL DEFAULT '';
