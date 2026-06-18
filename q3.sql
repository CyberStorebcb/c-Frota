SELECT DISTINCT UPPER(REGEXP_REPLACE(dados_veiculo->>'placa', '[^A-Z0-9]', '', 'g')) AS placa_checklist
FROM checklists c
WHERE c.progresso = 100
  AND c.data_inspecao = '2026-05-27'
  AND NOT EXISTS (
    SELECT 1 FROM vehicles v
    WHERE deleted_at IS NULL
      AND status = 'ATIVO'
      AND UPPER(REGEXP_REPLACE(v.placa, '[^A-Z0-9]', '', 'g')) =
          UPPER(REGEXP_REPLACE(dados_veiculo->>'placa', '[^A-Z0-9]', '', 'g'))
  )
ORDER BY 1;