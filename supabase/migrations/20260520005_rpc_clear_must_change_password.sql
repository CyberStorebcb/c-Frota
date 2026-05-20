-- Função RPC com SECURITY DEFINER para limpar must_change_password do próprio usuário.
-- Bypass de RLS necessário caso a policy de UPDATE ainda não exista.
CREATE OR REPLACE FUNCTION public.clear_must_change_password(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só permite que o usuário autenticado limpe seu próprio flag
  IF auth.uid() IS DISTINCT FROM user_id THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  UPDATE public.profiles
  SET must_change_password = false
  WHERE id = user_id;
END;
$$;

-- Garante que apenas usuários autenticados possam chamar
REVOKE ALL ON FUNCTION public.clear_must_change_password(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_must_change_password(uuid) TO authenticated;
