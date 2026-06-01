-- Função que verifica se um email pertence a um supervisor ou coordenador autorizado.
-- Extrai o primeiro segmento do local do email e compara com a lista oficial.
CREATE OR REPLACE FUNCTION public.can_justify_by_email(p_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(split_part(split_part(p_email, '@', 1), '.', 1)) = ANY(ARRAY[
    -- Coordenadores (nomes normalizados, sem acento)
    'afonso', 'jackson', 'jamerson', 'julio', 'leandro', 'marcos',
    'paulo', 'pryscilla', 'rafaela', 'ricardo', 'ruan', 'valvick', 'waldir',
    -- Supervisores (primeiro nome normalizado, sem acento)
    'antonio', 'arlisson', 'cristophe', 'deilton', 'edivan', 'everaldo',
    'everton', 'guilherme', 'idialdo', 'joao', 'josiel', 'leonardo',
    'luis', 'luiz', 'matheus', 'messias', 'mikeias', 'pablo',
    'raimundo', 'werbeth'
  ])
$$;

-- Atualiza RLS de checklist_ausencia_justificativas para aceitar justificadores
DROP POLICY IF EXISTS "checklist_ausencia_justificativas_write_admin" ON public.checklist_ausencia_justificativas;
CREATE POLICY "checklist_ausencia_justificativas_write_justificador"
  ON public.checklist_ausencia_justificativas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    OR public.can_justify_by_email(auth.email())
  );

DROP POLICY IF EXISTS "checklist_ausencia_justificativas_update_admin" ON public.checklist_ausencia_justificativas;
CREATE POLICY "checklist_ausencia_justificativas_update_justificador"
  ON public.checklist_ausencia_justificativas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    OR public.can_justify_by_email(auth.email())
  );

DROP POLICY IF EXISTS "checklist_ausencia_justificativas_delete_admin" ON public.checklist_ausencia_justificativas;
CREATE POLICY "checklist_ausencia_justificativas_delete_justificador"
  ON public.checklist_ausencia_justificativas FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    OR public.can_justify_by_email(auth.email())
  );

-- Atualiza RLS de apontamentos para permitir justificadores atualizarem
DROP POLICY IF EXISTS "Admins podem atualizar apontamentos" ON public.apontamentos;
CREATE POLICY "Admins e justificadores podem atualizar apontamentos"
  ON public.apontamentos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    OR public.can_justify_by_email(auth.email())
  );
