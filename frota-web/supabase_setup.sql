-- =============================================================
-- Tabela: public.checklists
-- Execute no SQL Editor do Supabase Dashboard
-- =============================================================

create table if not exists public.checklists (
  id                uuid primary key default gen_random_uuid(),
  tipo              text not null,
  nome_operador     text not null,
  matricula         text not null,

  -- dados extras do veículo (placa, modelo, km, horímetro, prefixo, processo, localidade…)
  dados_veiculo     jsonb not null default '{}',

  data_inspecao     date not null,

  -- respostas: { "sky-01": "c", "sky-02": "nc", "sky-03": "na", ... }
  respostas         jsonb not null default '{}',

  -- observações por item: { "sky-02": "Pneu traseiro direito murcho" }
  observacoes       jsonb not null default '{}',

  progresso         integer not null default 0,
  nc_count          integer not null default 0,
  nc_imperativos    integer not null default 0,

  problemas         text not null default '',
  descricao_problema text not null default '',
  nome_supervisor   text not null default '',

  -- URLs dos arquivos enviados ao Supabase Storage
  evidencia_urls    text[] not null default '{}',

  created_at        timestamptz not null default now()
);

-- =============================================================
-- Índices
-- =============================================================

create index if not exists checklists_tipo_idx         on public.checklists (tipo);
create index if not exists checklists_data_idx         on public.checklists (data_inspecao desc);
create index if not exists checklists_matricula_idx    on public.checklists (matricula);
create index if not exists checklists_nc_count_idx     on public.checklists (nc_count);
create index if not exists checklists_nc_imp_idx       on public.checklists (nc_imperativos);

-- =============================================================
-- RLS (Row Level Security)
-- =============================================================

alter table public.checklists enable row level security;

-- Operadores anônimos podem INSERIR (formulário público via link)
create policy "anon_insert_checklists"
  on public.checklists
  for insert
  to anon
  with check (true);

-- Usuários autenticados (admin) podem LER todos
create policy "auth_select_checklists"
  on public.checklists
  for select
  to authenticated
  using (true);

-- =============================================================
-- Storage bucket: checklist-evidencias
-- Crie via Supabase Dashboard > Storage > New bucket
-- Nome: checklist-evidencias  |  Public: sim
-- Ou descomente e execute o SQL abaixo:
-- =============================================================

-- insert into storage.buckets (id, name, public)
-- values ('checklist-evidencias', 'checklist-evidencias', true)
-- on conflict (id) do nothing;

-- create policy "anon_upload_evidencias"
--   on storage.objects
--   for insert
--   to anon
--   with check (bucket_id = 'checklist-evidencias');

-- create policy "public_read_evidencias"
--   on storage.objects
--   for select
--   to public
--   using (bucket_id = 'checklist-evidencias');
