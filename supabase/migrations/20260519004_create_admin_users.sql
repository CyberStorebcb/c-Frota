-- Cria 10 usuários admin via auth.users + profiles
-- Senha padrão: Cgb@2026 (must_change_password = true)

DO $$
DECLARE
  v_uid UUID;
  v_email TEXT;
  v_name  TEXT;
  emails  TEXT[] := ARRAY[
    'janaina.feitosa@cgbengenharia.com.br',
    'lucas.moreira@cgbengenharia.com.br',
    'thiago.cordeiro@cgbengenharia.com.br',
    'francisco.assis@cgbengenharia.com.br',
    'marksuel.sousa@cgbengenharia.com.br',
    'marcelo.soares@cgbengenharia.com.br',
    'alderlan.alonso@cgbengenharia.com.br',
    'erberth.pereira@cgbengenharia.com.br',
    'rosivaldo.freitas@cgbengenharia.com.br',
    'lucas.nascimento@cgbengenharia.com.br'
  ];
  names   TEXT[] := ARRAY[
    'Janaina Feitosa',
    'Lucas Moreira',
    'Thiago Cordeiro',
    'Francisco Assis',
    'Marksuel Sousa',
    'Marcelo Soares',
    'Alderlan Alonso',
    'Erbert Pereira',
    'Rosivaldo Freitas',
    'Lucas Nascimento'
  ];
BEGIN
  FOR i IN 1..array_length(emails, 1) LOOP
    v_email := emails[i];
    v_name  := names[i];

    IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
      RAISE NOTICE 'Já existe, pulando: %', v_email;
      CONTINUE;
    END IF;

    v_uid := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
    ) VALUES (
      v_uid,
      '00000000-0000-0000-0000-000000000000',
      v_email,
      crypt('Cgb@2026', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_name),
      now(), now(),
      'authenticated', 'authenticated'
    );

    INSERT INTO public.profiles (id, role, must_change_password)
    VALUES (v_uid, 'admin', true)
    ON CONFLICT (id) DO UPDATE SET role = 'admin', must_change_password = true;

    RAISE NOTICE 'Criado: % (%)', v_name, v_email;
  END LOOP;
END $$;
