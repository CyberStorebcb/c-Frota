-- Habilita RLS na tabela checklists e permite inserção anônima (motoristas sem login)
alter table public.checklists enable row level security;

-- Motoristas (anon) podem inserir checklists
create policy "Anon pode inserir checklists"
  on public.checklists for insert
  to anon
  with check (true);

-- Usuários autenticados (admins/supervisores) podem ler todos os checklists
create policy "Autenticados podem ler checklists"
  on public.checklists for select
  to authenticated using (true);

-- Admins podem deletar checklists
create policy "Admins podem deletar checklists"
  on public.checklists for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );
