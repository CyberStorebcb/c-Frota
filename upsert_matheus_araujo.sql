-- Upsert 16 veículos — Supervisor: MATHEUS ARAUJO
-- Gerado em 2026-05-28
-- Conflito resolvido pela placa (ON CONFLICT (placa) DO UPDATE)

INSERT INTO vehicles (placa, ano, modelo, tipo, proprietario, prefixo, responsavel, supervisor, coordenador, base, setor, processo, status, deleted_at)
VALUES
  ('SMM5B73', '2024', 'HONDA BROS', 'MOTO', 'PRÓPRIO', 'LEVANTADOR', 'CRISTOPHE DANIEL',           'MATHEUS ARAUJO', 'RICARDO', 'ITM', 'OPERACIONAL', 'GOMAN', 'ATIVO', NULL),
  ('SMM7E85', '2024', 'HONDA BROS', 'MOTO', 'PRÓPRIO', 'LEVANTADOR', 'CRISTOPHE DANIEL',           'MATHEUS ARAUJO', 'RICARDO', 'ITM', 'OPERACIONAL', 'GOMAN', 'ATIVO', NULL),
  ('UJO6G99', '2026', 'HONDA BROS', 'MOTO', 'PRÓPRIO', 'LEVANTADOR', 'CRISTOPHE DANIEL',           'MATHEUS ARAUJO', 'RICARDO', 'ITM', 'OPERACIONAL', 'GOMAN', 'ATIVO', NULL),
  ('SNJ0G01', '2023', 'HONDA BROS', 'MOTO', 'PRÓPRIO', 'LEVANTADOR', 'JOADSON CARLOS DA SILVA FERREIRA', 'MATHEUS ARAUJO', 'RAFAELA', 'PDT', 'OPERACIONAL', 'GOMAN', 'ATIVO', NULL),
  ('SNJ4E15', '2023', 'HONDA BROS', 'MOTO', 'PRÓPRIO', 'LEVANTADOR', 'WALLYSON DA SILVA ALMEIDA',  'MATHEUS ARAUJO', 'RAFAELA', 'PDT', 'OPERACIONAL', 'GOMAN', 'ATIVO', NULL),
  ('SMM5B75', '2024', 'HONDA BROS', 'MOTO', 'PRÓPRIO', 'LEVANTADOR', 'LEONARDO BRUNO',             'MATHEUS ARAUJO', 'MARCOS',  'BDC', 'OPERACIONAL', 'SPOT',  'ATIVO', NULL),
  ('SNJ0D78', '2024', 'HONDA BROS', 'MOTO', 'PRÓPRIO', 'LEVANTADOR', 'JOSIEL MENESES',             'MATHEUS ARAUJO', 'MARCOS',  'BDC', 'OPERACIONAL', 'SPOT',  'ATIVO', NULL),
  ('RZQ9H30', '2022', 'HONDA BROS', 'MOTO', 'PRÓPRIO', 'LEVANTADOR', '',                           'MATHEUS ARAUJO', 'RAFAELA', 'PDS', 'OPERACIONAL', 'GOMAN', 'ATIVO', NULL),
  ('SMM7E79', '2024', 'HONDA BROS', 'MOTO', 'PRÓPRIO', 'LEVANTADOR', 'JONAS ARAUJO SALES',         'MATHEUS ARAUJO', 'RAFAELA', 'PDS', 'OPERACIONAL', 'GOMAN', 'ATIVO', NULL),
  ('SMM7E81', '2024', 'HONDA BROS', 'MOTO', 'PRÓPRIO', 'LEVANTADOR', 'GEOMARI',                   'MATHEUS ARAUJO', 'RAFAELA', 'PDS', 'OPERACIONAL', 'GOMAN', 'ATIVO', NULL),
  ('SMM7E76', '2024', 'HONDA BROS', 'MOTO', 'PRÓPRIO', 'LEVANTADOR', 'LEONARDO MARTINS',           'MATHEUS ARAUJO', 'RICARDO', 'STI', 'OPERACIONAL', 'GOMAN', 'ATIVO', NULL),
  ('SMM7F01', '2024', 'HONDA BROS', 'MOTO', 'PRÓPRIO', 'LEVANTADOR', 'EDNALDO ABREU MEIRELES',     'MATHEUS ARAUJO', 'RICARDO', 'STI', 'OPERACIONAL', 'GOMAN', 'ATIVO', NULL),
  ('SMM5B72', '2024', 'HONDA BROS', 'MOTO', 'PRÓPRIO', 'LEVANTADOR', 'LAERCIO CORTA LIMA',         'MATHEUS ARAUJO', 'RICARDO', 'BCB', 'OPERACIONAL', 'GOMAN', 'ATIVO', NULL),
  ('SMM7E78', '2024', 'HONDA BROS', 'MOTO', 'PRÓPRIO', 'LEVANTADOR', 'FAGNER ALMEIDA',             'MATHEUS ARAUJO', 'RICARDO', 'BCB', 'OPERACIONAL', 'GOMAN', 'ATIVO', NULL),
  ('SMM7E97', '2024', 'HONDA BROS', 'MOTO', 'PRÓPRIO', 'LEVANTADOR', 'JAMES',                     'MATHEUS ARAUJO', 'RICARDO', 'BCB', 'OPERACIONAL', 'GOMAN', 'ATIVO', NULL),
  ('UJO6G93', '2026', 'HONDA BROS', 'MOTO', 'PRÓPRIO', 'LEVANTADOR', 'ACLÉCIO',                   'MATHEUS ARAUJO', 'RAFAELA', 'PDS', 'OPERACIONAL', 'GOMAN', 'ATIVO', NULL)
ON CONFLICT (placa) DO UPDATE SET
  ano         = EXCLUDED.ano,
  modelo      = EXCLUDED.modelo,
  tipo        = EXCLUDED.tipo,
  proprietario = EXCLUDED.proprietario,
  prefixo     = EXCLUDED.prefixo,
  responsavel = EXCLUDED.responsavel,
  supervisor  = EXCLUDED.supervisor,
  coordenador = EXCLUDED.coordenador,
  base        = EXCLUDED.base,
  setor       = EXCLUDED.setor,
  processo    = EXCLUDED.processo,
  status      = EXCLUDED.status,
  deleted_at  = NULL; -- restaura caso estivesse desmobilizado
