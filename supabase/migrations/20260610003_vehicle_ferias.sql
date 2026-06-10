-- Férias: marcação persistente de colaborador em férias.
-- Ao contrário das justificativas normais (período fixo), esta entrada
-- permanece ativa até que um justificador a remova manualmente.
-- A placa aparece como "justificado" em qualquer período enquanto estiver aqui.

CREATE TABLE IF NOT EXISTS public.vehicle_ferias (
  id         uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  placa      text          NOT NULL,
  setor      text          NOT NULL DEFAULT 'operacional',
  obs        text          NOT NULL DEFAULT '',
  created_by uuid          REFERENCES auth.users(id),
  created_at timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (placa, setor)
);

ALTER TABLE public.vehicle_ferias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicle_ferias_select_auth"
  ON public.vehicle_ferias FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "vehicle_ferias_insert_justificador"
  ON public.vehicle_ferias FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_has_permission('justify')
    OR public.can_justify_by_email(auth.email())
  );

CREATE POLICY "vehicle_ferias_delete_justificador"
  ON public.vehicle_ferias FOR DELETE
  TO authenticated
  USING (
    public.current_user_has_permission('justify')
    OR public.can_justify_by_email(auth.email())
  );
