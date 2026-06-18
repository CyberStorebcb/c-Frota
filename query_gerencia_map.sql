SELECT 
  COALESCE(NULLIF(TRIM(coordenador),''), 'SEM GERENCIA') AS gerencia,
  COALESCE(NULLIF(TRIM(responsavel),''), 'SEM RESPONSAVEL') AS responsavel,
  COALESCE(NULLIF(TRIM(base),''), 'SEM BASE') AS base,
  COUNT(*) AS qty
FROM vehicles
WHERE deleted_at IS NULL AND status = 'ATIVO'
  AND coordenador IS NOT NULL
  AND coordenador NOT LIKE 'N%O ATRIBU%DO'
GROUP BY 1,2,3
ORDER BY 1,2,3;