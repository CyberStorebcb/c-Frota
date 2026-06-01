-- Adiciona 'valdir' e 'francisco' à função can_justify_by_email.
-- Valdir Rabelo: lista tem WALDIR mas email começa com valdir.
-- Francisco Leandro Nunes: lista tem LEANDRO mas email começa com francisco.
CREATE OR REPLACE FUNCTION public.can_justify_by_email(p_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(split_part(split_part(p_email, '@', 1), '.', 1)) = ANY(ARRAY[
    'afonso', 'jackson', 'jamerson', 'julio', 'leandro', 'marcos',
    'paulo', 'pryscilla', 'rafaela', 'ricardo', 'ruan', 'valvick', 'waldir',
    'antonio', 'arlisson', 'cristophe', 'deilton', 'edivan', 'everaldo',
    'everton', 'guilherme', 'idialdo', 'joao', 'josiel', 'leonardo',
    'luis', 'luiz', 'matheus', 'messias', 'mikeias', 'pablo',
    'raimundo', 'werbeth',
    'valdir',    -- Valdir Rabelo (lista tem WALDIR, email começa com valdir)
    'francisco'  -- Francisco Leandro Nunes (lista tem LEANDRO, email começa com francisco)
  ])
$$;
