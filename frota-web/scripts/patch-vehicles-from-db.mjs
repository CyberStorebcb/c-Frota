/**
 * patch-vehicles-from-db.mjs
 * Atualiza totalVehiclesFleet.gen.ts com os dados do BANCO DE DADOS - VEICULOS OP ATIVOS.txt
 * Campos atualizados: ano, modelo, tipo, proprietario, prefixo, responsavel, base, setor, processo, gerencia
 * Campos preservados: servico, contrato, cc, imei
 */
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const genPath = join(__dirname, '../src/data/totalVehiclesFleet.gen.ts')

// ---------------------------------------------------------------------------
// Dados autoritativos — 217 veículos OP ativos
// SUPERVISOR (arquivo) → responsavel (DB/código)
// GERÊNCIA  (arquivo) → gerencia (DB/código)
// ---------------------------------------------------------------------------
const authData = [
  { placa: 'RZY6D45', ano: '2023', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-ARI-E001M',      responsavel: 'LEONARDO ESTRELA',               base: 'ITM', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'RZY6E65', ano: '2023', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-MRA-E001M',      responsavel: 'LEONARDO ESTRELA',               base: 'ITM', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'RZY6F95', ano: '2023', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-VGD-E001M',      responsavel: 'LEONARDO ESTRELA',               base: 'ITM', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'RZY6G55', ano: '2023', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-ITM-E001M',      responsavel: 'LEONARDO ESTRELA',               base: 'ITM', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SMM9C81', ano: '2024', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-VGD-E002M',      responsavel: 'LEONARDO ESTRELA',               base: 'ITM', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SMM9F74', ano: '2024', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-VTO-M001M',      responsavel: 'LEONARDO ESTRELA',               base: 'ITM', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SMP6C55', ano: '2024', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-CTD-E001M',      responsavel: 'LEONARDO ESTRELA',               base: 'ITM', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SMP6C66', ano: '2024', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-ITM-E002M',      responsavel: 'LEONARDO ESTRELA',               base: 'ITM', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SNS1F66', ano: '2023', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-MRA-M001M',      responsavel: 'LEONARDO ESTRELA',               base: 'ITM', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SOX8C56', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-ITM-C002M',      responsavel: 'LEONARDO ESTRELA',               base: 'ITM', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SOX8D05', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-MRA-D001M',      responsavel: 'LEONARDO ESTRELA',               base: 'ITM', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SOY0A70', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-MRA-C001M',      responsavel: 'LEONARDO ESTRELA',               base: 'ITM', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SOY0E70', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-ITM-C001M',      responsavel: 'LEONARDO ESTRELA',               base: 'ITM', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'TEY6B12', ano: '2025', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'ALUGADO',  prefixo: 'MA-ANJ-E001M',      responsavel: 'LEONARDO ESTRELA',               base: 'ITM', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'TEY6B35', ano: '2025', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'ALUGADO',  prefixo: 'MA-ITM-M001M',      responsavel: 'LEONARDO ESTRELA',               base: 'ITM', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SOX2G09', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-W003M',      responsavel: 'PABLO LOURA',                    base: 'BCB', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'SOX6G06', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-Q002M',      responsavel: 'PABLO LOURA',                    base: 'BCB', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'SOX7A75', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-W001M',      responsavel: 'PABLO LOURA',                    base: 'BCB', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'SOX8E25', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-Q001M',      responsavel: 'PABLO LOURA',                    base: 'BCB', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'ROU6H98', ano: '2023', modelo: '11-180',            tipo: 'SKY CD',      proprietario: 'COMODATO', prefixo: 'MA-STI-V001',       responsavel: 'EVERALDO NOGUEIRA',              base: 'STI', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'ROU7A79', ano: '2023', modelo: '11-180',            tipo: 'SKY CD',      proprietario: 'COMODATO', prefixo: 'MA-ITM-V001',       responsavel: 'EVERALDO NOGUEIRA',              base: 'ITM', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'SNQ1J22', ano: '2023', modelo: '14-210',            tipo: 'SKY CD',      proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-V001',       responsavel: 'EVERALDO NOGUEIRA',              base: 'BCB', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'RZY6A34', ano: '2023', modelo: 'SAVEIRO',           tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-STI-C002M',      responsavel: 'ARLISSON ROGERIO',               base: 'STI', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'RZY6F55', ano: '2023', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-STI-E001M/T',    responsavel: 'ARLISSON ROGERIO',               base: 'STI', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'RZY6I95', ano: '2023', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-ZDC-E001M/T',    responsavel: 'ARLISSON ROGERIO',               base: 'STI', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SMM9C85', ano: '2024', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-STI-E002M/T',    responsavel: 'ARLISSON ROGERIO',               base: 'STI', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SMM9C87', ano: '2024', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-BMJ-E001M',      responsavel: 'ARLISSON ROGERIO',               base: 'STI', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SMM9F06', ano: '2024', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-ZDC-M001M',      responsavel: 'ARLISSON ROGERIO',               base: 'STI', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SMP6C73', ano: '2024', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-STI-E003M',      responsavel: 'ARLISSON ROGERIO',               base: 'STI', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SNW5D73', ano: '2024', modelo: 'SAVEIRO',           tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-ZDC-C001M',      responsavel: 'ARLISSON ROGERIO',               base: 'STI', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SNW5E33', ano: '2024', modelo: 'SAVEIRO',           tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-STI-C001M',      responsavel: 'ARLISSON ROGERIO',               base: 'STI', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SOX6G46', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-STI-D002M',      responsavel: 'ARLISSON ROGERIO',               base: 'STI', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SOX8C96', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-STI-D003M',      responsavel: 'ARLISSON ROGERIO',               base: 'STI', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SOX8F96', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-MON-E001M',      responsavel: 'ARLISSON ROGERIO',               base: 'STI', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SOX8G96', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-SJC-E001M',      responsavel: 'ARLISSON ROGERIO',               base: 'STI', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SOX9A06', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-STI-D001M',      responsavel: 'ARLISSON ROGERIO',               base: 'STI', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'TEY6A98', ano: '2025', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'ALUGADO',  prefixo: 'MA-STI-E004M',      responsavel: 'ARLISSON ROGERIO',               base: 'STI', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'TEY6B00', ano: '2025', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'ALUGADO',  prefixo: 'MA-ALP-E001M',      responsavel: 'ARLISSON ROGERIO',               base: 'STI', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'TEY6B01', ano: '2025', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'ALUGADO',  prefixo: 'MA-STL-M001M',      responsavel: 'ARLISSON ROGERIO',               base: 'STI', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'TEY6B19', ano: '2025', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'ALUGADO',  prefixo: 'MA-PIO-E001M',      responsavel: 'ARLISSON ROGERIO',               base: 'STI', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'TGO6A31', ano: '2024', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-STL-E001M/T',    responsavel: 'ARLISSON ROGERIO',               base: 'STI', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'UJO6G98', ano: '2026', modelo: 'HONDA BROS',        tipo: 'MOTO',        proprietario: 'PRÓPRIO',  prefixo: 'MA-STI-H001M',      responsavel: 'ARLISSON ROGERIO',               base: 'STI', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'QTF3E63', ano: '2023', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-COR-E001',       responsavel: 'DEILTON RIBEIRO',                base: 'BCB', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'UHV9F26', ano: '2026', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-C002M',      responsavel: 'DEILTON RIBEIRO',                base: 'BCB', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'RZY2A86', ano: '2023', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-VRF-E001M',      responsavel: 'DEILTON RIBEIRO',                base: 'BCB', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SMM9C83', ano: '2024', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-SMT-E001M',      responsavel: 'DEILTON RIBEIRO',                base: 'BCB', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SNS9J75', ano: '2023', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-E001',       responsavel: 'DEILTON RIBEIRO',                base: 'BCB', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'UHV0J47', ano: '2026', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-C001M',      responsavel: 'DEILTON RIBEIRO',                base: 'BCB', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SOW9A57', ano: '2025', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-ODC-M001M',      responsavel: 'DEILTON RIBEIRO',                base: 'BCB', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SOX2B59', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-D001M',      responsavel: 'DEILTON RIBEIRO',                base: 'BCB', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SOX6G56', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-D002M',      responsavel: 'DEILTON RIBEIRO',                base: 'BCB', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SOX6G76', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-C003M',      responsavel: 'DEILTON RIBEIRO',                base: 'BCB', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SOX7D45', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-COR-C001M',      responsavel: 'DEILTON RIBEIRO',                base: 'BCB', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'TEY6A99', ano: '2025', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'ALUGADO',  prefixo: 'MA-LGV-E001M',      responsavel: 'DEILTON RIBEIRO',                base: 'BCB', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'TEY6B09', ano: '2025', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'ALUGADO',  prefixo: 'MA-SLG-M001M',      responsavel: 'DEILTON RIBEIRO',                base: 'BCB', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'TEY6B15', ano: '2025', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'ALUGADO',  prefixo: 'MA-SMT-M001M',      responsavel: 'DEILTON RIBEIRO',                base: 'BCB', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'TEY6B16', ano: '2025', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'ALUGADO',  prefixo: 'MA-COR-M001M',      responsavel: 'DEILTON RIBEIRO',                base: 'BCB', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'TEY6B20', ano: '2025', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'ALUGADO',  prefixo: 'MA-PRO-E001M',      responsavel: 'DEILTON RIBEIRO',                base: 'BCB', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'TEY6B23', ano: '2025', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'ALUGADO',  prefixo: 'MA-BCB-E002M',      responsavel: 'DEILTON RIBEIRO',                base: 'BCB', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'TEY6B34', ano: '2025', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'ALUGADO',  prefixo: 'MA-ATM-E001M',      responsavel: 'DEILTON RIBEIRO',                base: 'BCB', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'THM0A57', ano: '2025', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-E003M',      responsavel: 'DEILTON RIBEIRO',                base: 'BCB', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'UJO6G89', ano: '2026', modelo: 'HONDA BROS',        tipo: 'MOTO',        proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-H001M',      responsavel: 'DEILTON RIBEIRO',                base: 'BCB', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'SMM5B78', ano: '2024', modelo: 'HONDA BROS',        tipo: 'MOTO',        proprietario: 'PRÓPRIO',  prefixo: 'LEVANTADOR',        responsavel: 'LUIS FILIPE',                    base: 'BCB', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SMM7E74', ano: '2024', modelo: 'HONDA BROS',        tipo: 'MOTO',        proprietario: 'PRÓPRIO',  prefixo: 'PROSPECTOR',        responsavel: 'LUIS FILIPE',                    base: 'BCB', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SMP6C71', ano: '2024', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-STI-F010M',      responsavel: 'LUIS FILIPE',                    base: 'STI', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SNA7I31', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-ITM-F001M',      responsavel: 'LUIS FILIPE',                    base: 'ITM', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SNA7I34', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-PDT-F006M',      responsavel: 'ANTONIO MARCOS SALAZAR DOS REIS', base: 'PDT', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SNA7I39', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-ITM-F002M',      responsavel: 'LUIS FILIPE',                    base: 'ITM', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SNA7I44', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-F011M',      responsavel: 'LUIS FILIPE',                    base: 'BCB', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SNA7I51', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-BDC-F002M',      responsavel: 'ANTONIO MARCOS SALAZAR DOS REIS', base: 'BDC', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SNA7I55', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-STI-F003M',      responsavel: 'LUIS FILIPE',                    base: 'STI', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SNA7I61', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-BDC-F001M',      responsavel: 'ANTONIO MARCOS SALAZAR DOS REIS', base: 'BDC', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SNA7I66', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-STI-F005M',      responsavel: 'LUIS FILIPE',                    base: 'STI', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SNA7I69', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-STI-F006M',      responsavel: 'LUIS FILIPE',                    base: 'STI', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SNA7I86', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-PDT-F001M',      responsavel: 'ANTONIO MARCOS SALAZAR DOS REIS', base: 'PDT', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SNS1B59', ano: '2023', modelo: 'SAVEIRO',           tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-F001M',      responsavel: 'LUIS FILIPE',                    base: 'BCB', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SNS4C48', ano: '2023', modelo: 'SAVEIRO',           tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'PROSPECTOR',        responsavel: 'LUIS FILIPE',                    base: 'PDT', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SNS7C99', ano: '2023', modelo: 'SAVEIRO',           tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-PDS-F001M',      responsavel: 'ANTONIO MARCOS SALAZAR DOS REIS', base: 'PDS', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SNS7D69', ano: '2023', modelo: 'SAVEIRO',           tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-STI-F002M',      responsavel: 'LUIS FILIPE',                    base: 'STI', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'UHV4A87', ano: '2026', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-PDT-F002M',      responsavel: 'ANTONIO MARCOS SALAZAR DOS REIS', base: 'PDT', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SNS7F89', ano: '2023', modelo: 'SAVEIRO',           tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-F007M',      responsavel: 'LUIS FILIPE',                    base: 'BCB', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SNS7G49', ano: '2023', modelo: 'SAVEIRO',           tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-PDS-F006M',      responsavel: 'ANTONIO MARCOS SALAZAR DOS REIS', base: 'PDS', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SNT3D60', ano: '2023', modelo: 'SAVEIRO',           tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'PEDREIRO',          responsavel: 'LUIS FILIPE',                    base: 'PDT', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SNT3I80', ano: '2023', modelo: 'SAVEIRO',           tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-STI-F001M',      responsavel: 'LUIS FILIPE',                    base: 'STI', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SNT3J70', ano: '2023', modelo: 'SAVEIRO',           tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-STI-F008M',      responsavel: 'LUIS FILIPE',                    base: 'STI', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SNW5C43', ano: '2024', modelo: 'SAVEIRO',           tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'PEDREIRO',          responsavel: 'ANTONIO MARCOS SALAZAR DOS REIS', base: 'PDS', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SOX0I57', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-PDT-F007M',      responsavel: 'ANTONIO MARCOS SALAZAR DOS REIS', base: 'PDT', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SOX2D89', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-F009M',      responsavel: 'LUIS FILIPE',                    base: 'BCB', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SOX2D99', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-STI-F007M',      responsavel: 'LUIS FILIPE',                    base: 'STI', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SOX2E59', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-F012M',      responsavel: 'LUIS FILIPE',                    base: 'BCB', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SOX2F19', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-PDS-F002M',      responsavel: 'ANTONIO MARCOS SALAZAR DOS REIS', base: 'PDS', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SOX2G59', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-PDS-F003M',      responsavel: 'ANTONIO MARCOS SALAZAR DOS REIS', base: 'PDS', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SOX8A85', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-PDS-F008M',      responsavel: 'ANTONIO MARCOS SALAZAR DOS REIS', base: 'PDS', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SOX8C05', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-F008M',      responsavel: 'LUIS FILIPE',                    base: 'BCB', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SOX8C26', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-F003M',      responsavel: 'LUIS FILIPE',                    base: 'BCB', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SOX8C85', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-PDS-F004M',      responsavel: 'ANTONIO MARCOS SALAZAR DOS REIS', base: 'PDS', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SOX8D75', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-F004M',      responsavel: 'LUIS FILIPE',                    base: 'BCB', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SOX8E76', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-F006M',      responsavel: 'LUIS FILIPE',                    base: 'BCB', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SOY0B40', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-PDT-F005M',      responsavel: 'ANTONIO MARCOS SALAZAR DOS REIS', base: 'PDT', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SOY0C50', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-PDT-F004M',      responsavel: 'ANTONIO MARCOS SALAZAR DOS REIS', base: 'PDT', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SOY0D20', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-F005M',      responsavel: 'LUIS FILIPE',                    base: 'BCB', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SOY0D90', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-PDS-F005M',      responsavel: 'ANTONIO MARCOS SALAZAR DOS REIS', base: 'PDS', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SOY0E10', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-STI-F004M',      responsavel: 'LUIS FILIPE',                    base: 'STI', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'TEY6B04', ano: '2025', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'ALUGADO',  prefixo: 'MA-PDT-F003M',      responsavel: 'ANTONIO MARCOS SALAZAR DOS REIS', base: 'PDT', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'TEY6B17', ano: '2025', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'ALUGADO',  prefixo: 'MA-BCB-F002M',      responsavel: 'LUIS FILIPE',                    base: 'BCB', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'SNS7E49', ano: '2023', modelo: 'SAVEIRO',           tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-PDT-F008M',      responsavel: 'ANTONIO MARCOS SALAZAR DOS REIS', base: 'PDT', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'ROU6E53', ano: '2023', modelo: '9-180',             tipo: 'SKY CS',      proprietario: 'COMODATO', prefixo: 'MA-BCB-T001M',      responsavel: 'MIKEIAS VELOSO',                 base: 'BCB', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'ROU6E64', ano: '2023', modelo: '17-210',            tipo: 'MUNCK',       proprietario: 'COMODATO', prefixo: 'MA-BCB-O004M',      responsavel: 'MIKEIAS VELOSO',                 base: 'BCB', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'RZR5J07', ano: '2022', modelo: '17-190',            tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-O005M',      responsavel: 'MIKEIAS VELOSO',                 base: 'BCB', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'RZR6B37', ano: '2022', modelo: '17-190',            tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-O003M',      responsavel: 'MIKEIAS VELOSO',                 base: 'BCB', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'SAM8E08', ano: '2024', modelo: 'TECTOR 9-190',      tipo: 'CAMINHÃO',    proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-O008M',      responsavel: 'MIKEIAS VELOSO',                 base: 'BCB', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'SNQ1J62', ano: '2023', modelo: '17-210',            tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-O001M',      responsavel: 'MIKEIAS VELOSO',                 base: 'BCB', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'SOD4F46', ano: '2024', modelo: '17-210',            tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-O002M',      responsavel: 'MIKEIAS VELOSO',                 base: 'BCB', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'SPB8F97', ano: '2025', modelo: '17-210',            tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-O006M',      responsavel: 'MIKEIAS VELOSO',                 base: 'BCB', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'JCX0F54', ano: '2024', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-PDS-M001M',      responsavel: 'RAIMUNDO HERMERSON',             base: 'PDS', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'ROY8G54', ano: '2023', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-PLR-E001M',      responsavel: 'RAIMUNDO HERMERSON',             base: 'PDS', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'ROY8H86', ano: '2023', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-PDT-M001M',      responsavel: 'GUILHERME FONSECA',              base: 'PDT', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'RZY6C85', ano: '2023', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-IGG-E001M',      responsavel: 'RAIMUNDO HERMERSON',             base: 'PDS', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'RZY6J35', ano: '2023', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-SDM-M001M',      responsavel: 'GUILHERME FONSECA',              base: 'PDT', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'RZY7B05', ano: '2023', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-ESP-E001M',      responsavel: 'RAIMUNDO HERMERSON',             base: 'PDS', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'RZY7B75', ano: '2023', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-PDS-E001M',      responsavel: 'RAIMUNDO HERMERSON',             base: 'PDS', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'SMM9C61', ano: '2024', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-GEB-E001',       responsavel: 'GUILHERME FONSECA',              base: 'PDT', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'SMM9C69', ano: '2024', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-BDC-E002',       responsavel: 'GUILHERME FONSECA',              base: 'BDC', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'SMM9C75', ano: '2024', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-LGM-M001M',      responsavel: 'RAIMUNDO HERMERSON',             base: 'PDS', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'SMM9C78', ano: '2024', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-TTM-E001',       responsavel: 'GUILHERME FONSECA',              base: 'PDT', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'SMM9C84', ano: '2024', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-SJB-E001',       responsavel: 'GUILHERME FONSECA',              base: 'PDT', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'SMP6C58', ano: '2024', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-DPO-E001',       responsavel: 'GUILHERME FONSECA',              base: 'PDT', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'SMP6C60', ano: '2024', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-BDC-E001',       responsavel: 'GUILHERME FONSECA',              base: 'BDC', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'SMP6C64', ano: '2024', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-SDM-E001',       responsavel: 'GUILHERME FONSECA',              base: 'PDT', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'SMP6C70', ano: '2024', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-LDP-E001M',      responsavel: 'RAIMUNDO HERMERSON',             base: 'PDS', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'SNS9J95', ano: '2023', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-GCD-M001',       responsavel: 'GUILHERME FONSECA',              base: 'PDT', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'SOW8I17', ano: '2025', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-PDT-E001',       responsavel: 'GUILHERME FONSECA',              base: 'PDT', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'SOW9B27', ano: '2025', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-PDT-E002',       responsavel: 'GUILHERME FONSECA',              base: 'PDT', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'SOX0G97', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-PDT-C001',       responsavel: 'GUILHERME FONSECA',              base: 'PDT', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'SOX2C89', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-LDP-C001M',      responsavel: 'RAIMUNDO HERMERSON',             base: 'PDS', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'SOX6F76', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-BDC-C001',       responsavel: 'GUILHERME FONSECA',              base: 'BDC', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'SOX8B35', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-PDT-C002',       responsavel: 'GUILHERME FONSECA',              base: 'PDT', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'SOX8C65', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-PDT-D001',       responsavel: 'GUILHERME FONSECA',              base: 'PDT', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'SOX9I46', ano: '2025', modelo: 'STRADA',            tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-PDS-C001M',      responsavel: 'RAIMUNDO HERMERSON',             base: 'PDS', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'TEY6B02', ano: '2025', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'ALUGADO',  prefixo: 'MA-BDC-M001',       responsavel: 'GUILHERME FONSECA',              base: 'BDC', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'TEY6B11', ano: '2025', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'ALUGADO',  prefixo: 'MA-DPO-M001',       responsavel: 'GUILHERME FONSECA',              base: 'PDT', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'TEY6B13', ano: '2025', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'ALUGADO',  prefixo: 'MA-PDS-E002M',      responsavel: 'RAIMUNDO HERMERSON',             base: 'PDS', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'TEY6B27', ano: '2025', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'ALUGADO',  prefixo: 'MA-BDC-M002',       responsavel: 'GUILHERME FONSECA',              base: 'BDC', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'TEY6B28', ano: '2025', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'ALUGADO',  prefixo: 'MA-LDP-M001M',      responsavel: 'RAIMUNDO HERMERSON',             base: 'PDS', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'THK4I40', ano: '2024', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-FFC-E001',       responsavel: 'GUILHERME FONSECA',              base: 'BDC', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'UJO6G84', ano: '2026', modelo: 'HONDA BROS',        tipo: 'MOTO',        proprietario: 'PRÓPRIO',  prefixo: 'MA-PDT-H001M',      responsavel: 'GUILHERME FONSECA',              base: 'PDT', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'UJO6G96', ano: '2026', modelo: 'HONDA BROS',        tipo: 'MOTO',        proprietario: 'PRÓPRIO',  prefixo: 'MA-BDC-H001M',      responsavel: 'GUILHERME FONSECA',              base: 'BDC', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'PAULO'    },
  { placa: 'ROU6H44', ano: '2023', modelo: '9-180',             tipo: 'SKY CS',      proprietario: 'COMODATO', prefixo: 'MA-ITM-P001M',      responsavel: 'WERBETH RODRIGUES',              base: 'ITM', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'ROU7A77', ano: '2023', modelo: '9-180',             tipo: 'SKY CS',      proprietario: 'COMODATO', prefixo: 'MA-ITM-P002M',      responsavel: 'WERBETH RODRIGUES',              base: 'ITM', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'ROU7A88', ano: '2023', modelo: '9-180',             tipo: 'SKY CS',      proprietario: 'COMODATO', prefixo: 'MA-STI-P001M',      responsavel: 'WERBETH RODRIGUES',              base: 'STI', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'ROU7A90', ano: '2023', modelo: '9-180',             tipo: 'SKY CS',      proprietario: 'COMODATO', prefixo: 'MA-BCB-P002M',      responsavel: 'WERBETH RODRIGUES',              base: 'BCB', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'ROU7A91', ano: '2023', modelo: '9-180',             tipo: 'SKY CS',      proprietario: 'COMODATO', prefixo: 'MA-BCB-P001M',      responsavel: 'WERBETH RODRIGUES',              base: 'BCB', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'ROU7A92', ano: '2023', modelo: '9-180',             tipo: 'SKY CS',      proprietario: 'COMODATO', prefixo: 'MA-STI-P002M',      responsavel: 'WERBETH RODRIGUES',              base: 'STI', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'PCH0215', ano: '2018', modelo: '17-230',            tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'MA-SPOT-JM01',      responsavel: 'LUIZ CARLOS',                    base: 'STI', setor: 'OPERACIONAL', processo: 'SPOT',       gerencia: 'JAMERSON' },
  { placa: 'PDY9283', ano: '2017', modelo: 'ATEGO 1419',        tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'MA-SPOT-JM02',      responsavel: 'LUIZ CARLOS',                    base: 'STI', setor: 'OPERACIONAL', processo: 'SPOT',       gerencia: 'JAMERSON' },
  { placa: 'PEB5663', ano: '2017', modelo: 'ATEGO 1419',        tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'MA-SPOT-JM03',      responsavel: 'LUIZ CARLOS',                    base: 'STI', setor: 'OPERACIONAL', processo: 'SPOT',       gerencia: 'JAMERSON' },
  { placa: 'PDY2583', ano: '2017', modelo: 'ATEGO 1419',        tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'MA-ITM-O004M',      responsavel: 'CRISTOPHE DANIEL',               base: 'ITM', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'QYG9I76', ano: '2019', modelo: '17-230',            tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'MA-ITM-O003M',      responsavel: 'CRISTOPHE DANIEL',               base: 'ITM', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'PEA5933', ano: '2017', modelo: 'ATRON 1635 S',      tipo: 'CARRETA',     proprietario: 'PRÓPRIO',  prefixo: 'TRANSPORTE',        responsavel: 'JACKSON SOUZA',                  base: 'BCB', setor: 'OPERACIONAL', processo: 'TRANSPORTE', gerencia: 'JACKSON'  },
  { placa: 'SMM5B73', ano: '2024', modelo: 'HONDA BROS',        tipo: 'MOTO',        proprietario: 'PRÓPRIO',  prefixo: 'LEVANTADOR',        responsavel: 'CRISTOPHE DANIEL',               base: 'ITM', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'SMM7E85', ano: '2024', modelo: 'HONDA BROS',        tipo: 'MOTO',        proprietario: 'PRÓPRIO',  prefixo: 'LEVANTADOR',        responsavel: 'CRISTOPHE DANIEL',               base: 'ITM', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'UHN6E75', ano: '2025', modelo: '17-210',            tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'MA-ITM-O002M',      responsavel: 'CRISTOPHE DANIEL',               base: 'ITM', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'UHN6F95', ano: '2025', modelo: '17-210',            tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'MA-ITM-O001M',      responsavel: 'CRISTOPHE DANIEL',               base: 'PDS', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'UJO6G99', ano: '2026', modelo: 'HONDA BROS',        tipo: 'MOTO',        proprietario: 'PRÓPRIO',  prefixo: 'LEVANTADOR',        responsavel: 'CRISTOPHE DANIEL',               base: 'ITM', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'PGW2593', ano: '2017', modelo: 'SEMI REBOQUE',      tipo: 'CARRETA',     proprietario: 'PRÓPRIO',  prefixo: 'TRANSPORTE',        responsavel: 'JACKSON SOUZA',                  base: 'BCB', setor: 'OPERACIONAL', processo: 'TRANSPORTE', gerencia: 'JACKSON'  },
  { placa: 'PGW2G43', ano: '2017', modelo: 'SEMI REBOQUE',      tipo: 'CARRETA',     proprietario: 'PRÓPRIO',  prefixo: 'TRANSPORTE',        responsavel: 'JACKSON SOUZA',                  base: 'BCB', setor: 'OPERACIONAL', processo: 'TRANSPORTE', gerencia: 'JACKSON'  },
  { placa: 'SNM6D11', ano: '2023', modelo: 'ACTROS 2548S',      tipo: 'CARRETA',     proprietario: 'PRÓPRIO',  prefixo: 'TRANSPORTE',        responsavel: 'JACKSON SOUZA',                  base: 'BCB', setor: 'OPERACIONAL', processo: 'TRANSPORTE', gerencia: 'JACKSON'  },
  { placa: 'SNS4A08', ano: '2023', modelo: 'SAVEIRO',           tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'MA-BCB-J101M',      responsavel: 'LUIS FILIPE',                    base: 'BCB', setor: 'OPERACIONAL', processo: 'GERE',       gerencia: 'JÚLIO'    },
  { placa: 'TEY6B06', ano: '2025', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'ALUGADO',  prefixo: 'DEFEITO',           responsavel: 'MIKEIAS VELOSO',                 base: 'BCB', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'RZY5C44', ano: '2023', modelo: 'SAVEIRO',           tipo: 'PICAPE LEVE', proprietario: 'PRÓPRIO',  prefixo: 'LEVANTADOR',        responsavel: 'ANDERSON',                       base: 'PDT', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
  { placa: 'RZY2D36', ano: '2023', modelo: 'HILUX',             tipo: 'PICAPE 4X4',  proprietario: 'PRÓPRIO',  prefixo: 'MA-STL-E001',       responsavel: 'ARLISSON ROGERIO',               base: 'STI', setor: 'OPERACIONAL', processo: 'GSTC',       gerencia: 'AFONSO'   },
  { placa: 'ROU6E55', ano: '2023', modelo: '11-180',            tipo: 'SKY CD',      proprietario: 'COMODATO', prefixo: 'MA-PDS-V001M',      responsavel: 'JOAO CLIMACO',                   base: 'PDS', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
  { placa: 'ROU6H94', ano: '2023', modelo: '9-180',             tipo: 'SKY CS',      proprietario: 'COMODATO', prefixo: 'MA-PDS-P001M',      responsavel: 'JOAO CLIMACO',                   base: 'PDS', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
  { placa: 'RZO1I53', ano: '2022', modelo: '9-170',             tipo: 'SKY CS',      proprietario: 'PRÓPRIO',  prefixo: 'MA-PDS-T001M',      responsavel: 'JOAO CLIMACO',                   base: 'PDS', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
  { placa: 'RZR1G10', ano: '2022', modelo: '9-170',             tipo: 'SKY CS',      proprietario: 'PRÓPRIO',  prefixo: 'MA-PDS-P002M',      responsavel: 'JOAO CLIMACO',                   base: 'PDS', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
  { placa: 'SOD4F36', ano: '2024', modelo: '26-260',            tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'TRANSPORTE',        responsavel: 'JACKSON SOUZA',                  base: 'BCB', setor: 'OPERACIONAL', processo: 'TRANSPORTE', gerencia: 'JACKSON'  },
  { placa: 'PDY9293', ano: '2017', modelo: 'ATEGO 1419',        tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'MA-PDT-O034M',      responsavel: 'RAIMUNDO ALMEIDA',               base: 'PDT', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
  { placa: 'ROV1J63', ano: '2023', modelo: '17-210',            tipo: 'MUNCK',       proprietario: 'COMODATO', prefixo: 'MA-PDT-O032M',      responsavel: 'RAIMUNDO ALMEIDA',               base: 'PDT', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
  { placa: 'ROV1J74', ano: '2023', modelo: '17-210',            tipo: 'MUNCK',       proprietario: 'COMODATO', prefixo: 'MA-PDT-O030M',      responsavel: 'RAIMUNDO ALMEIDA',               base: 'PDT', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
  { placa: 'SNJ0G01', ano: '2023', modelo: 'HONDA BROS',        tipo: 'MOTO',        proprietario: 'PRÓPRIO',  prefixo: 'LEVANTADOR',        responsavel: 'JOADSON CARLOS DA SILVA FERREIRA', base: 'PDT', setor: 'OPERACIONAL', processo: 'GOMAN',   gerencia: 'RAFAELA'  },
  { placa: 'SNJ4E15', ano: '2023', modelo: 'HONDA BROS',        tipo: 'MOTO',        proprietario: 'PRÓPRIO',  prefixo: 'LEVANTADOR',        responsavel: 'WALLYSON DA SILVA ALMEIDA',       base: 'PDT', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
  { placa: 'SPB8E27', ano: '2025', modelo: '17-210',            tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'MA-PDT-O031M',      responsavel: 'RAIMUNDO ALMEIDA',               base: 'PDT', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
  { placa: 'UHN6E25', ano: '2025', modelo: '17-210',            tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'MA-PDT-O035M',      responsavel: 'RAIMUNDO ALMEIDA',               base: 'PDT', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
  { placa: 'UHN6F15', ano: '2025', modelo: '17-210',            tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'MA-PDT-O036M',      responsavel: 'RAIMUNDO ALMEIDA',               base: 'PDT', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
  { placa: 'ROU6H74', ano: '2023', modelo: '11-180',            tipo: 'SKY CD',      proprietario: 'COMODATO', prefixo: 'PDT-V002M',         responsavel: 'MARCOS ALENCAR',                 base: 'PDT', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
  { placa: 'ROU7A73', ano: '2023', modelo: '9-180',             tipo: 'SKY CS',      proprietario: 'COMODATO', prefixo: 'PDT-T001M',         responsavel: 'MARCOS ALENCAR',                 base: 'PDT', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
  { placa: 'ROU7A80', ano: '2023', modelo: '9-180',             tipo: 'SKY CS',      proprietario: 'COMODATO', prefixo: 'PDT-P001M',         responsavel: 'MARCOS ALENCAR',                 base: 'PDT', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
  { placa: 'ROU7A86', ano: '2023', modelo: '9-180',             tipo: 'SKY CS',      proprietario: 'COMODATO', prefixo: 'PDT-P002M',         responsavel: 'MARCOS ALENCAR',                 base: 'PDT', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
  { placa: 'RZR7D91', ano: '2022', modelo: 'ATEGO 1419',        tipo: 'SKY CD',      proprietario: 'PRÓPRIO',  prefixo: 'BDC-V001M',         responsavel: 'MARCOS ALENCAR',                 base: 'BDC', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
  { placa: 'PDY2H93', ano: '2017', modelo: 'ATEGO 1419',        tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'BDC-05',            responsavel: 'JOSIEL MENESES',                 base: 'BDC', setor: 'OPERACIONAL', processo: 'SPOT',       gerencia: 'MARCOS'   },
  { placa: 'POK8G72', ano: '2020', modelo: '14-190',            tipo: 'MUNCK',       proprietario: 'ALUGADO',  prefixo: 'BDC-04',            responsavel: 'JOSIEL MENESES',                 base: 'BDC', setor: 'OPERACIONAL', processo: 'SPOT',       gerencia: 'MARCOS'   },
  { placa: 'QYG6J04', ano: '2019', modelo: '17-230',            tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'BDC-03',            responsavel: 'JOSIEL MENESES',                 base: 'BDC', setor: 'OPERACIONAL', processo: 'SPOT',       gerencia: 'MARCOS'   },
  { placa: 'SAY9F26', ano: '2022', modelo: '17-190',            tipo: 'MUNCK',       proprietario: 'ALUGADO',  prefixo: 'BDC-02',            responsavel: 'JOSIEL MENESES',                 base: 'BDC', setor: 'OPERACIONAL', processo: 'SPOT',       gerencia: 'MARCOS'   },
  { placa: 'SMM5B75', ano: '2024', modelo: 'HONDA BROS',        tipo: 'MOTO',        proprietario: 'PRÓPRIO',  prefixo: 'LEVANTADOR',        responsavel: 'LEONARDO BRUNO',                 base: 'BDC', setor: 'OPERACIONAL', processo: 'SPOT',       gerencia: 'MARCOS'   },
  { placa: 'SNJ0D78', ano: '2024', modelo: 'HONDA BROS',        tipo: 'MOTO',        proprietario: 'PRÓPRIO',  prefixo: 'LEVANTADOR',        responsavel: 'JOSIEL MENESES',                 base: 'BDC', setor: 'OPERACIONAL', processo: 'SPOT',       gerencia: 'MARCOS'   },
  { placa: 'SNQ1J42', ano: '2023', modelo: '17-210',            tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'BDC-01',            responsavel: 'JOSIEL MENESES',                 base: 'BDC', setor: 'OPERACIONAL', processo: 'SPOT',       gerencia: 'MARCOS'   },
  { placa: 'QYG7A14', ano: '2019', modelo: '17-230',            tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'MA-PDS-O004M',      responsavel: 'MESSIAS ABREU',                  base: 'PDS', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
  { placa: 'RZQ9H30', ano: '2022', modelo: 'HONDA BROS',        tipo: 'MOTO',        proprietario: 'PRÓPRIO',  prefixo: 'LEVANTADOR',        responsavel: '',                               base: 'PDS', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
  { placa: 'RZQ9I73', ano: '2022', modelo: 'ATEGO 1419',        tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'MA-PDS-O002M',      responsavel: 'MESSIAS ABREU',                  base: 'PDS', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
  { placa: 'RZU4I25', ano: '2022', modelo: 'ATEGO 1419',        tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'MA-PDS-O003M',      responsavel: 'MESSIAS ABREU',                  base: 'PDS', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
  { placa: 'SMM7E79', ano: '2024', modelo: 'HONDA BROS',        tipo: 'MOTO',        proprietario: 'PRÓPRIO',  prefixo: 'LEVANTADOR',        responsavel: 'JONAS ARAUJO SALES',             base: 'PDS', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
  { placa: 'SMM7E81', ano: '2024', modelo: 'HONDA BROS',        tipo: 'MOTO',        proprietario: 'PRÓPRIO',  prefixo: 'LEVANTADOR',        responsavel: 'GEOMARI',                        base: 'PDS', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
  { placa: 'UHN6D95', ano: '2025', modelo: '17-210',            tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'MA-PDS-O001',       responsavel: 'MESSIAS ABREU',                  base: 'PDS', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
  { placa: 'PDZ2233', ano: '2017', modelo: 'ATEGO 1419',        tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'MA-STI-O003M',      responsavel: 'EDIVAN LIMA',                    base: 'STI', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'PEC0343', ano: '2017', modelo: 'ATEGO 1419',        tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'MA-STI-O004M',      responsavel: 'EDIVAN LIMA',                    base: 'STI', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'ROU6D57', ano: '2023', modelo: '9-180',             tipo: 'SKY CS',      proprietario: 'COMODATO', prefixo: 'MA-STI-T001M',      responsavel: 'EDIVAN LIMA',                    base: 'STI', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'SMM7E76', ano: '2024', modelo: 'HONDA BROS',        tipo: 'MOTO',        proprietario: 'PRÓPRIO',  prefixo: 'LEVANTADOR',        responsavel: 'LEONARDO MARTINS',               base: 'STI', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'SMM7F01', ano: '2024', modelo: 'HONDA BROS',        tipo: 'MOTO',        proprietario: 'PRÓPRIO',  prefixo: 'LEVANTADOR',        responsavel: 'EDNALDO ABREU MEIRELES',         base: 'STI', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'UHN6E15', ano: '2025', modelo: '17-210',            tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'MA-STI-O001M',      responsavel: 'EDIVAN LIMA',                    base: 'STI', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'UHN6F85', ano: '2025', modelo: '17-210',            tipo: 'MUNCK',       proprietario: 'PRÓPRIO',  prefixo: 'MA-STI-O002M',      responsavel: 'EDIVAN LIMA',                    base: 'STI', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'ROU6H57', ano: '2023', modelo: '11-180',            tipo: 'SKY CD',      proprietario: 'COMODATO', prefixo: 'PDT-V001M',         responsavel: 'MARCOS ALENCAR',                 base: 'PDT', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
  { placa: 'SMM5B72', ano: '2024', modelo: 'HONDA BROS',        tipo: 'MOTO',        proprietario: 'PRÓPRIO',  prefixo: 'LEVANTADOR',        responsavel: 'LAERCIO CORTA LIMA',             base: 'BCB', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'SMM7E78', ano: '2024', modelo: 'HONDA BROS',        tipo: 'MOTO',        proprietario: 'PRÓPRIO',  prefixo: 'LEVANTADOR',        responsavel: 'FAGNER ALMEIDA',                 base: 'BCB', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'SMM7E97', ano: '2024', modelo: 'HONDA BROS',        tipo: 'MOTO',        proprietario: 'PRÓPRIO',  prefixo: 'LEVANTADOR',        responsavel: 'JAMES',                          base: 'BCB', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'UJO6G93', ano: '2026', modelo: 'HONDA BROS',        tipo: 'MOTO',        proprietario: 'PRÓPRIO',  prefixo: 'LEVANTADOR',        responsavel: 'ACLÉCIO',                        base: 'PDS', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
  { placa: 'RZR1F70', ano: '2022', modelo: '9-170',             tipo: 'SKY CS',      proprietario: 'PRÓPRIO',  prefixo: 'OBRA EXTRA',        responsavel: 'WERBETH RODRIGUES',              base: 'BCB', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RICARDO'  },
  { placa: 'PED0343', ano: '2017', modelo: 'ATEGO 1419',        tipo: 'SKY CD',      proprietario: 'PRÓPRIO',  prefixo: 'OBRA EXTRA 169',    responsavel: 'JOAO CLIMACO',                   base: 'PDT', setor: 'OPERACIONAL', processo: 'GOMAN',      gerencia: 'RAFAELA'  },
]

// ---------------------------------------------------------------------------
// Lê e parseia o arquivo gen.ts
// ---------------------------------------------------------------------------
const raw = readFileSync(genPath, 'utf8')

// Separa o cabeçalho (até a declaração do array) do corpo do array
const arrayDeclIdx = raw.indexOf('export const TOTAL_VEHICLE_ROWS')
const header = raw.slice(0, arrayDeclIdx)
const rest = raw.slice(arrayDeclIdx)

// Extrai o conteúdo JSON entre [ ... ]
// Usa '= [' para não confundir com o '[]' do tipo TypeScript
const eqBracketIdx = rest.indexOf('= [')
const arrayStart = eqBracketIdx + 2 // aponta para '['
const arrayEnd = rest.lastIndexOf(']')
const jsonContent = rest.slice(arrayStart, arrayEnd + 1)

// Parse como JSON
let rows
try {
  rows = JSON.parse(jsonContent)
} catch (e) {
  console.error('Erro ao parsear o array JSON:', e.message)
  process.exit(1)
}

console.log(`Lido: ${rows.length} veículos no gen.ts`)

// ---------------------------------------------------------------------------
// Aplica os dados autoritativos
// ---------------------------------------------------------------------------
const authMap = new Map(authData.map(r => [r.placa, r]))

let updatedCount = 0
let newCount = 0
const notFound = []

for (const row of rows) {
  const auth = authMap.get(row.placa)
  if (!auth) continue
  row.ano         = auth.ano
  row.modelo      = auth.modelo
  row.tipo        = auth.tipo
  row.proprietario = auth.proprietario
  row.prefixo     = auth.prefixo
  row.responsavel = auth.responsavel
  row.base        = auth.base
  row.setor       = auth.setor
  row.processo    = auth.processo
  row.gerencia    = auth.gerencia
  updatedCount++
}

// Adiciona veículos novos (não presentes no gen.ts)
const existingPlates = new Set(rows.map(r => r.placa))
for (const auth of authData) {
  if (!existingPlates.has(auth.placa)) {
    rows.push({
      placa:        auth.placa,
      ano:          auth.ano,
      modelo:       auth.modelo,
      tipo:         auth.tipo,
      proprietario: auth.proprietario,
      prefixo:      auth.prefixo,
      responsavel:  auth.responsavel,
      base:         auth.base,
      setor:        auth.setor,
      processo:     auth.processo,
      gerencia:     auth.gerencia,
      servico:      '',
      contrato:     '',
      cc:           '',
      imei:         '',
    })
    newCount++
    console.log(`Adicionado novo veículo: ${auth.placa}`)
  }
}

console.log(`Atualizados: ${updatedCount} | Novos: ${newCount}`)

// ---------------------------------------------------------------------------
// Serializa de volta para o formato TypeScript
// ---------------------------------------------------------------------------
function serializeRow(row) {
  const q = v => JSON.stringify(String(v ?? ''))
  return [
    '  {',
    `    "placa": ${q(row.placa)},`,
    `    "ano": ${q(row.ano)},`,
    `    "modelo": ${q(row.modelo)},`,
    `    "tipo": ${q(row.tipo)},`,
    `    "proprietario": ${q(row.proprietario)},`,
    `    "prefixo": ${q(row.prefixo)},`,
    `    "responsavel": ${q(row.responsavel)},`,
    `    "base": ${q(row.base)},`,
    `    "setor": ${q(row.setor)},`,
    `    "processo": ${q(row.processo)},`,
    `    "gerencia": ${q(row.gerencia)},`,
    `    "servico": ${q(row.servico)},`,
    `    "contrato": ${q(row.contrato)},`,
    `    "cc": ${q(row.cc)},`,
    `    "imei": ${q(row.imei)}`,
    '  }',
  ].join('\n')
}

const bodyLines = rows.map(serializeRow).join(',\n')
const newContent =
  header +
  'export const TOTAL_VEHICLE_ROWS: TotalVehicleSourceRow[] = [\n' +
  bodyLines + '\n' +
  ']\n'

writeFileSync(genPath, newContent, 'utf8')
console.log(`✓ gen.ts atualizado — ${rows.length} veículos total`)
