-- Justificativas de checklist não realizado (RESERVA | NÃO RODOU)
create table if not exists public.checklist_ausencia_justificativas (
  id uuid primary key default gen_random_uuid(),
  placa text not null,
  periodo_inicio date not null,
  periodo_fim date not null,
  setor text not null default 'operacional',
  motivo text not null check (motivo in ('RESERVA', 'NÃO RODOU')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  unique (placa, periodo_inicio, periodo_fim, setor)
);

create trigger checklist_ausencia_justificativas_updated_at
  before update on public.checklist_ausencia_justificativas
  for each row execute function public.set_updated_at();

alter table public.checklist_ausencia_justificativas enable row level security;

create policy "checklist_ausencia_justificativas_select_auth"
  on public.checklist_ausencia_justificativas for select
  to authenticated using (true);

create policy "checklist_ausencia_justificativas_write_admin"
  on public.checklist_ausencia_justificativas for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  );

create policy "checklist_ausencia_justificativas_update_admin"
  on public.checklist_ausencia_justificativas for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  );

create policy "checklist_ausencia_justificativas_delete_admin"
  on public.checklist_ausencia_justificativas for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  );
