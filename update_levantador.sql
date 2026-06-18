UPDATE vehicles
SET responsavel = 'MATHEUS ARAUJO', updated_at = NOW()
WHERE placa IN (
  'SMM5B73','SMM7E85','UJO6G99',
  'SNJ0G01','SNJ4E15','RZQ9H30',
  'SMM7E79','SMM7E81','SMM7E76',
  'SMM7F01','SMM5B72','SMM7E78',
  'SMM7E97','UJO6G93'
);

UPDATE vehicles
SET coordenador = 'RAFAELA', updated_at = NOW()
WHERE placa = 'UJO6G93';

UPDATE vehicles
SET coordenador = 'RICARDO', updated_at = NOW()
WHERE placa = 'UJO6G99';

SELECT placa, responsavel, coordenador FROM vehicles
WHERE placa IN (
  'SMM5B73','SMM7E85','UJO6G99',
  'SNJ0G01','SNJ4E15','RZQ9H30',
  'SMM7E79','SMM7E81','SMM7E76',
  'SMM7F01','SMM5B72','SMM7E78',
  'SMM7E97','UJO6G93'
)
ORDER BY placa;