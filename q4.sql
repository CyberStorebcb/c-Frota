-- Status da SMPOE76
SELECT placa, status, prefixo, deleted_at FROM vehicles WHERE placa ILIKE 'SMPOE76';

-- Distribuicao de checklists hoje por gerencia (coordenador)
SELECT v.coordenador, COUNT(DISTINCT UPPER(REGEXP_REPLACE(c.dados_veiculo->>'placa', '[^A-Z0-9]', '', 'g'))) AS realizaram
FROM checklists c
JOIN vehicles v ON UPPER(REGEXP_REPLACE(v.placa, '[^A-Z0-9]', '', 'g')) =
                   UPPER(REGEXP_REPLACE(c.dados_veiculo->>'placa', '[^A-Z0-9]', '', 'g'))
WHERE c.progresso = 100 AND c.data_inspecao = '2026-05-27' AND v.deleted_at IS NULL AND v.status = 'ATIVO'
GROUP BY v.coordenador ORDER BY realizaram DESC;