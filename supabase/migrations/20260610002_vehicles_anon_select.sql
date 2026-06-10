-- Permite leitura anônima da tabela vehicles (apenas ativos, sem deleted_at).
-- Necessário para que o ChecklistPublicoPage (rota pública, sem login)
-- reconheça veículos cadastrados no Supabase ao validar a placa.
-- Dados de frota (placa, modelo, responsável) não são sensíveis —
-- já aparecem nos checklists enviados por qualquer motorista.
CREATE POLICY "Anon pode ler veículos ativos"
  ON public.vehicles FOR SELECT
  TO anon
  USING (deleted_at IS NULL);
