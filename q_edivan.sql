SELECT placa, ano, modelo, tipo, proprietario, prefixo, responsavel, base, setor, processo, coordenador, status
FROM vehicles
WHERE placa IN ('PDZ2233','PEC0343','ROU6D57','UHN6E15','UHN6F85','PCA4297','PEC0C23')
ORDER BY placa;