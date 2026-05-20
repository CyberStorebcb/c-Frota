-- Habilita RLS na tabela apontamentos e define políticas de acesso.
-- Modelo idêntico ao de checklists (20260519003_checklists_rls.sql):
--   • anon pode inserir (apontamentos são criados pelo checklist público)
--   • autenticados lêem tudo
--   • apenas admin/super_admin podem atualizar e deletar

alter table public.apontamentos enable row level security;

grant usage on schema public to anon;
grant insert on public.apontamentos to anon;
grant insert, select, update, delete on public.apontamentos to authenticated;

-- Checklist público (sem login) cria o apontamento ao submeter
create policy "Anon pode inserir apontamentos"
  on public.apontamentos for insert
  to anon
  with check (true);

-- Admins/supervisores logados criam apontamentos também (ex.: apontamento manual)
create policy "Autenticados podem inserir apontamentos"
  on public.apontamentos for insert
  to authenticated
  with check (true);

-- Qualquer usuário autenticado lê os apontamentos (dashboard, gerenciar, histórico)
create policy "Autenticados podem ler apontamentos"
  on public.apontamentos for select
  to authenticated
  using (true);

-- Apenas admins podem atualizar (marcar resolvido, justificativa, agendamento)
create policy "Admins podem atualizar apontamentos"
  on public.apontamentos for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

-- Apenas admins podem deletar apontamentos
create policy "Admins podem deletar apontamentos"
  on public.apontamentos for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );
