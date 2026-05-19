-- Soft delete: em vez de apagar, marca o veículo com deleted_at
alter table public.vehicles add column if not exists deleted_at timestamptz default null;

-- Atualiza a policy de leitura para excluir removidos por padrão
drop policy if exists "Autenticados podem ler veículos" on public.vehicles;

create policy "Autenticados podem ler veículos ativos"
  on public.vehicles for select
  to authenticated using (deleted_at is null);

create policy "Admins podem ler veículos removidos"
  on public.vehicles for select
  to authenticated using (
    deleted_at is not null and
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
