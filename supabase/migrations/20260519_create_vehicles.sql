-- Tabela de veículos cadastrados pelos admins
create table if not exists public.vehicles (
  id           uuid primary key default gen_random_uuid(),
  placa        text not null unique,
  modelo       text not null default '',
  tipo         text not null default 'VEICULOS LEVES',
  prefixo      text not null default '',
  responsavel  text not null default '',
  supervisor   text not null default '',
  coordenador  text not null default '',
  base         text not null default '',
  ano          text not null default '',
  status       text not null default 'ATIVO',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id)
);

-- Atualiza updated_at automaticamente
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger vehicles_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

-- RLS: apenas admins podem escrever; leitura autenticada
alter table public.vehicles enable row level security;

create policy "Autenticados podem ler veículos"
  on public.vehicles for select
  to authenticated using (true);

create policy "Admins podem inserir veículos"
  on public.vehicles for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins podem atualizar veículos"
  on public.vehicles for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins podem deletar veículos"
  on public.vehicles for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
