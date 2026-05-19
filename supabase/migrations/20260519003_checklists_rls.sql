-- Habilita RLS na tabela checklists e permite inserção anônima e autenticada
alter table public.checklists enable row level security;

grant usage on schema public to anon;
grant insert on public.checklists to anon;
grant insert on public.checklists to authenticated;

-- Motoristas sem login (anon) podem inserir checklists
create policy "Anon pode inserir checklists"
  on public.checklists for insert
  to anon
  with check (true);

-- Usuários logados (admins/supervisores) também podem inserir checklists
create policy "Autenticados podem inserir checklists"
  on public.checklists for insert
  to authenticated
  with check (true);

-- Usuários autenticados podem ler todos os checklists
create policy "Autenticados podem ler checklists"
  on public.checklists for select
  to authenticated using (true);

-- Admins podem atualizar checklists
create policy "Admins podem atualizar checklists"
  on public.checklists for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

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
