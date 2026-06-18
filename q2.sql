-- placas unicas que fizeram checklist hoje e estao no catalogo ativo
SELECT COUNT(DISTINCT UPPER(REGEXP_REPLACE(dados_veiculo->>'placa', '[^A-Z0-9]', '', 'g'))) AS realizaram_hoje
FROM checklists c
WHERE c.progresso = 100
  AND c.data_inspecao = '2026-05-27'
  AND EXISTS (
    SELECT 1 FROM vehicles v
    WHERE deleted_at IS NULL
      AND status = 'ATIVO'
      AND UPPER(REGEXP_REPLACE(v.placa, '[^A-Z0-9]', '', 'g')) =
          UPPER(REGEXP_REPLACE(dados_veiculo->>'placa', '[^A-Z0-9]', '', 'g'))
  );