-- Permissões granulares por utilizador (além do role admin/user)
CREATE TABLE IF NOT EXISTS public.user_permissions (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id),
  PRIMARY KEY (user_id, permission),
  CONSTRAINT user_permissions_permission_check CHECK (
    permission IN ('justify', 'resolve_apontamentos', 'manage_vehicles', 'manage_checklists')
  )
);

CREATE INDEX IF NOT EXISTS user_permissions_user_id_idx ON public.user_permissions (user_id);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Utilizador lê as próprias permissões
CREATE POLICY "user_permissions_select_own"
  ON public.user_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Super admins leem e gerenciam todas as permissões
CREATE POLICY "user_permissions_select_super_admin"
  ON public.user_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "user_permissions_insert_super_admin"
  ON public.user_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "user_permissions_delete_super_admin"
  ON public.user_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Verifica se um utilizador tem uma permissão (admins têm tudo)
CREATE OR REPLACE FUNCTION public.user_has_permission(p_user_id uuid, p_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND role IN ('admin', 'super_admin')
  )
  OR EXISTS (
    SELECT 1 FROM public.user_permissions
    WHERE user_id = p_user_id AND permission = p_permission
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_permission(p_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_permission(auth.uid(), p_permission);
$$;

GRANT EXECUTE ON FUNCTION public.user_has_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_has_permission(text) TO authenticated;

-- Atualiza RLS: justificadores via permissão explícita
DROP POLICY IF EXISTS "checklist_ausencia_justificativas_write_justificador" ON public.checklist_ausencia_justificativas;
CREATE POLICY "checklist_ausencia_justificativas_write_justificador"
  ON public.checklist_ausencia_justificativas FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_has_permission('justify')
    OR public.can_justify_by_email(auth.email())
  );

DROP POLICY IF EXISTS "checklist_ausencia_justificativas_update_justificador" ON public.checklist_ausencia_justificativas;
CREATE POLICY "checklist_ausencia_justificativas_update_justificador"
  ON public.checklist_ausencia_justificativas FOR UPDATE
  TO authenticated
  USING (
    public.current_user_has_permission('justify')
    OR public.can_justify_by_email(auth.email())
  );

DROP POLICY IF EXISTS "checklist_ausencia_justificativas_delete_justificador" ON public.checklist_ausencia_justificativas;
CREATE POLICY "checklist_ausencia_justificativas_delete_justificador"
  ON public.checklist_ausencia_justificativas FOR DELETE
  TO authenticated
  USING (
    public.current_user_has_permission('justify')
    OR public.can_justify_by_email(auth.email())
  );

-- Apontamentos: justificar ou resolver
DROP POLICY IF EXISTS "Admins e justificadores podem atualizar apontamentos" ON public.apontamentos;
CREATE POLICY "Permissões podem atualizar apontamentos"
  ON public.apontamentos FOR UPDATE
  TO authenticated
  USING (
    public.current_user_has_permission('justify')
    OR public.current_user_has_permission('resolve_apontamentos')
    OR public.can_justify_by_email(auth.email())
  );

-- Checklists: gerenciar
DROP POLICY IF EXISTS "Admins podem atualizar checklists" ON public.checklists;
CREATE POLICY "Permissões podem atualizar checklists"
  ON public.checklists FOR UPDATE
  TO authenticated
  USING (public.current_user_has_permission('manage_checklists'));

DROP POLICY IF EXISTS "Admins podem deletar checklists" ON public.checklists;
CREATE POLICY "Permissões podem deletar checklists"
  ON public.checklists FOR DELETE
  TO authenticated
  USING (public.current_user_has_permission('manage_checklists'));

-- Veículos: gerenciar
DROP POLICY IF EXISTS "vehicles_insert_admin" ON public.vehicles;
CREATE POLICY "vehicles_insert_admin"
  ON public.vehicles FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_has_permission('manage_vehicles'));

DROP POLICY IF EXISTS "vehicles_update_admin" ON public.vehicles;
CREATE POLICY "vehicles_update_admin"
  ON public.vehicles FOR UPDATE
  TO authenticated
  USING (public.current_user_has_permission('manage_vehicles'));

DROP POLICY IF EXISTS "vehicles_delete_admin" ON public.vehicles;
CREATE POLICY "vehicles_delete_admin"
  ON public.vehicles FOR DELETE
  TO authenticated
  USING (public.current_user_has_permission('manage_vehicles'));

DROP POLICY IF EXISTS "vehicles_select_all_admin" ON public.vehicles;
CREATE POLICY "vehicles_select_all_admin"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (public.current_user_has_permission('manage_vehicles'));
