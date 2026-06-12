-- Armazena o último KM registrado do veículo no momento da justificativa.
-- Permite rastrear o odômetro quando o veículo foi justificado sem checklist.

ALTER TABLE public.checklist_ausencia_justificativas
  ADD COLUMN IF NOT EXISTS km_ultimo integer;

-- Índice de expressão: torna a busca por placa dentro do JSON eficiente.
CREATE INDEX IF NOT EXISTS idx_checklists_dv_placa
  ON public.checklists ((dados_veiculo->>'placa'));

-- Função para buscar o último KM por placa de forma eficiente (DISTINCT ON).
-- Usada no frontend para exibir o odômetro atual antes de justificar.
CREATE OR REPLACE FUNCTION public.get_last_km_por_placas(placas text[])
RETURNS TABLE (placa text, km_atual text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (dados_veiculo->>'placa')
    dados_veiculo->>'placa',
    dados_veiculo->>'km_atual'
  FROM checklists c
  WHERE dados_veiculo->>'placa' = ANY(placas)
    AND dados_veiculo ? 'km_atual'
    AND dados_veiculo->>'km_atual' <> ''
    AND (dados_veiculo->>'km_atual') ~ '^\d+$'
  ORDER BY dados_veiculo->>'placa', c.data_inspecao DESC, c.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_last_km_por_placas(text[]) TO authenticated;
