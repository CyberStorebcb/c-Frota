-- Permite que cada usuário atualize seu próprio perfil (necessário para trocar senha no primeiro acesso)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Leitura: usuário lê apenas o próprio perfil
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Usuário lê próprio perfil'
  ) THEN
    EXECUTE 'CREATE POLICY "Usuário lê próprio perfil" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid())';
  END IF;
END $$;

-- Atualização: usuário atualiza apenas o próprio perfil
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Usuário atualiza próprio perfil'
  ) THEN
    EXECUTE 'CREATE POLICY "Usuário atualiza próprio perfil" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid())';
  END IF;
END $$;

-- Admins e super_admin leem todos os perfis
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admins leem todos os perfis'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins leem todos os perfis" ON public.profiles FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN (''admin'', ''super_admin''))
    )';
  END IF;
END $$;
