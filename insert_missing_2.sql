INSERT INTO vehicles (placa, ano, modelo, tipo, proprietario, prefixo, responsavel, supervisor, coordenador, base, setor, processo, status, em_manutencao)
VALUES
  ('PED0343', '2017', 'ATEGO 1419', 'SKY CD', 'PRÓPRIO', 'OBRA EXTRA 169', 'JOAO CLIMACO', '', '', 'PDT', 'OPERACIONAL', 'GOMAN', 'ATIVO', false),
  ('SOQ2I63', '2025', 'SAVEIRO', 'PICAPE LEVE', 'PRÓPRIO', 'TEC. DE PLANEJAMENTO DE PRODUÇÃO', 'ROGÉRIO LEANDRO PEIXOTO', '', '', 'BDC', 'ADM', 'SPOT', 'ATIVO', false)
ON CONFLICT (placa) DO UPDATE SET
  ano          = EXCLUDED.ano,
  modelo       = EXCLUDED.modelo,
  tipo         = EXCLUDED.tipo,
  proprietario = EXCLUDED.proprietario,
  prefixo      = EXCLUDED.prefixo,
  responsavel  = EXCLUDED.responsavel,
  base         = EXCLUDED.base,
  setor        = EXCLUDED.setor,
  processo     = EXCLUDED.processo,
  status       = EXCLUDED.status,
  deleted_at   = NULL;