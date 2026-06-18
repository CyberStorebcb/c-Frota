UPDATE vehicles SET
  prefixo = 'MA-STI-O003M',
  updated_at = NOW()
WHERE placa = 'PDZ2233';

UPDATE vehicles SET
  prefixo = 'MA-STI-O004M',
  updated_at = NOW()
WHERE placa = 'PEC0343';

UPDATE vehicles SET
  modelo = '9-180',
  prefixo = 'MA-STI-T001M',
  updated_at = NOW()
WHERE placa = 'ROU6D57';

UPDATE vehicles SET
  modelo       = '17-210',
  prefixo      = 'MA-STI-O001M',
  responsavel  = 'EDIVAN LIMA',
  base         = 'STI',
  coordenador  = 'RICARDO',
  updated_at   = NOW()
WHERE placa = 'UHN6E15';

UPDATE vehicles SET
  modelo      = '17-210',
  prefixo     = 'MA-STI-O002M',
  responsavel = 'EDIVAN LIMA',
  base        = 'STI',
  coordenador = 'RICARDO',
  updated_at  = NOW()
WHERE placa = 'UHN6F85';

SELECT placa, modelo, tipo, proprietario, prefixo, responsavel, base, coordenador
FROM vehicles
WHERE placa IN ('PDZ2233','PEC0343','ROU6D57','UHN6E15','UHN6F85')
ORDER BY placa;