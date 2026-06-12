-- Foto de evidência anexada no momento da justificativa de ausência.

ALTER TABLE public.checklist_ausencia_justificativas
  ADD COLUMN IF NOT EXISTS foto_url text;

-- Férias também pode ter evidência (ex: foto de documento de férias).
ALTER TABLE public.vehicle_ferias
  ADD COLUMN IF NOT EXISTS foto_url text;
