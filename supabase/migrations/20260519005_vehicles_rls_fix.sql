-- Recria todas as políticas da tabela vehicles aceitando admin e super_admin

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'vehicles' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.vehicles', pol.policyname);
  END LOOP;
END $$;

-- SELECT: autenticados veem veículos ativos
CREATE POLICY "vehicles_select_active" ON public.vehicles
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

-- SELECT: admin/super_admin veem todos (inclusive removidos)
CREATE POLICY "vehicles_select_all_admin" ON public.vehicles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- INSERT: admin/super_admin
CREATE POLICY "vehicles_insert_admin" ON public.vehicles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- UPDATE: admin/super_admin
CREATE POLICY "vehicles_update_admin" ON public.vehicles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- DELETE: admin/super_admin
CREATE POLICY "vehicles_delete_admin" ON public.vehicles
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );
