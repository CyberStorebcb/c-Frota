-- Índices de performance na tabela checklists
-- Motivo: query principal filtra por progresso=100 + data_inspecao (range)
--         e faz ILIKE em respostas::text para detectar NCs

-- 1. B-tree composto: acelera o filtro .eq('progresso', 100).gte('data_inspecao', ...)
--    que é executado a cada reload do ApontamentosContext
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_checklists_progresso_data
  ON public.checklists (progresso, data_inspecao);

-- 2. GIN em respostas: acelera o filtro respostas::text ILIKE '%"nc"%'
--    GIN em jsonb permite busca eficiente por valor dentro do objeto
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_checklists_respostas_gin
  ON public.checklists USING gin (respostas);

-- 3. B-tree em data_inspecao isolado: usado em ORDER BY e range scans
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_checklists_data_inspecao
  ON public.checklists (data_inspecao);

-- 4. B-tree em apontamentos(data_apontamento): usado nos filtros de período
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apontamentos_data_apontamento
  ON public.apontamentos (data_apontamento);
