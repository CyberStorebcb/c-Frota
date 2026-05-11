-- =============================================================
-- Tabela de checklists preenchidos
-- Execute no SQL Editor do Supabase Dashboard
-- =============================================================

create table if not exists public.checklists (
  id            uuid primary key default gen_random_uuid(),
  tipo          text not null,                        -- ex: 'sky', 'munck', 'picape-4x4'
  nome_operador text not null,
  matricula     text not null,
  placa         text not null default '',
  km            text not null default '',
  data_inspecao date not null,
  respostas     jsonb not null default '{}',          -- { "sky-01": "ok", "sky-02": "nok", ... }
  observacoes   jsonb not null default '{}',          -- { "sky-02": "Vazamento detectado" }
  progresso     integer not null default 0,           -- 0–100
  nok_count     integer not null default 0,
  created_at    timestamptz not null default now()
);

-- Índices para filtros comuns
create index if not exists checklists_tipo_idx          on public.checklists (tipo);
create index if not exists checklists_data_inspecao_idx on public.checklists (data_inspecao desc);
create index if not exists checklists_matricula_idx     on public.checklists (matricula);
create index if not exists checklists_nok_count_idx     on public.checklists (nok_count);

-- RLS: habilitar para produção
alter table public.checklists enable row level security;

-- Política: qualquer um pode INSERIR (link público)
create policy "insert_public"
  on public.checklists
  for insert
  to anon
  with check (true);

-- Política: apenas usuários autenticados podem LER
create policy "select_authenticated"
  on public.checklists
  for select
  to authenticated
  using (true);

-- OBS: para que o insert anônimo funcione, certifique-se de que
-- a anon key tem permissão de INSERT (padrão do Supabase).
