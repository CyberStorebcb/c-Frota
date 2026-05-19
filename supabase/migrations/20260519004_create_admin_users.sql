-- Cria 10 usuários admin via auth.users + profiles
-- Senha padrão: Cgb@2026 (must_change_password = true)
-- Executar no Supabase Dashboard > SQL Editor com service role

DO $$
DECLARE
  v_users TEXT[][] := ARRAY[
    ARRAY['janaina.feitosa@cgbengenharia.com.br',  'Janaina Feitosa'],
    ARRAY['lucas.moreira@cgbengenharia.com.br',    'Lucas Moreira'],
    ARRAY['thiago.cordeiro@cgbengenharia.com.br',  'Thiago Cordeiro'],
    ARRAY['francisco.assis@cgbengenharia.com.br',  'Francisco Assis'],
    ARRAY['marksuel.sousa@cgbengenharia.com.br',   'Marksuel Sousa'],
    ARRAY['marcelo.soares@cgbengenharia.com.br',   'Marcelo Soares'],
    ARRAY['alderlan.alonso@cgbengenharia.com.br',  'Alderlan Alonso'],
    ARRAY['erberth.pereira@cgbengenharia.com.br',  'Erbert Pereira'],
    ARRAY['rosivaldo.freitas@cgbengenharia.com.br','Rosivaldo Freitas'],
    ARRAY['lucas.nascimento@cgbengenharia.com.br', 'Lucas Nascimento']
  ];
  v_email TEXT;
  v_name  TEXT;
  v_uid   UUID;
BEGIN
  FOREACH v_email, v_name IN ARRAY v_users
  LOOP
    -- Pula se o email já existe
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
      RAISE NOTICE 'Usuário já existe, pulando: %', v_email;
      CONTINUE;
    END IF;

    v_uid := gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud
    ) VALUES (
      v_uid,
      '00000000-0000-0000-0000-000000000000',
      v_email,
      crypt('Cgb@2026', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_name),
      now(),
      now(),
      'authenticated',
      'authenticated'
    );

    INSERT INTO public.profiles (id, role, must_change_password)
    VALUES (v_uid, 'admin', true)
    ON CONFLICT (id) DO UPDATE SET role = 'admin', must_change_password = true;

    RAISE NOTICE 'Criado: % (%)', v_name, v_email;
  END LOOP;
END $$;
