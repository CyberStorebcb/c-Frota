/**
 * Atualiza gerência AFONSO no catálogo embebido conforme planilha operacional.
 * Uso: node scripts/patch-afonso-gerencia.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dest = path.join(__dirname, '..', 'src', 'data', 'totalVehiclesFleet.gen.ts')

const AFONSO_PLACAS = new Set(
  `RZY6D45 RZY6E65 RZY6F95 RZY6G55 SMM9C81 SMM9F74 SMP6C55 SMP6C66 SNS1F66 SOX8C56 SOX8D05 SOY0A70 SOY0E70 TEY6B12 TEY6B35
   RZY6A34 RZY6F55 RZY6I95 SMM9C85 SMM9C87 SMM9F06 SMP6C73 SNW5D73 SOX6G46 SOX8C96 SOX8F96 SOX8G96 SOX9A06 TEY6A98 TEY6B00 TEY6B01 TEY6B19 TGO6A31 UJO6G98
   QTF3E63 UHV9F26 RZY2A86 SMM9C83 SNS9J75 UHV0J47 SOW9A57 SOX2B59 SOX6G56 SOX6G76 SOX7D45 TEY6A99 TEY6B09 TEY6B15 TEY6B16 TEY6B20 TEY6B23 TEY6B34 THM0A57 UJO6G89 RZY2D36
   RZT0J51 RZY1C45 SNJ9F39 RZT0I21 RZT1A41 SNJ9F58 SNW5B43 RZP0G64 RZQ1B74 SMP0E62 RZY0G85`
    .split(/\s+/)
    .filter(Boolean),
)

const ROW_PATCHES = {
  UJO6G98: {
    modelo: 'HONDA BROS',
    prefixo: 'MA-STI-H001M',
    responsavel: 'ARLISSON ROGERIO',
    base: 'STI',
    setor: 'OPERACIONAL',
    processo: 'GSTC',
    gerencia: 'AFONSO',
  },
  UJO6G89: {
    modelo: 'HONDA BROS',
    prefixo: 'MA-BCB-H001M',
    responsavel: 'DEILTON RIBEIRO',
    base: 'BCB',
    setor: 'OPERACIONAL',
    processo: 'GSTC',
    gerencia: 'AFONSO',
  },
  UHV9F26: {
    placa: 'UHV9F26',
    ano: '2026',
    modelo: 'STRADA',
    tipo: 'PICAPE LEVE',
    proprietario: 'PRÓPRIO',
    prefixo: 'MA-BCB-C002M',
    responsavel: 'DEILTON RIBEIRO',
    base: 'BCB',
    setor: 'OPERACIONAL',
    processo: 'GSTC',
    gerencia: 'AFONSO',
    servico: '',
    contrato: '',
    cc: '',
    imei: '',
  },
  UHV0J47: {
    placa: 'UHV0J47',
    ano: '2026',
    modelo: 'STRADA',
    tipo: 'PICAPE LEVE',
    proprietario: 'PRÓPRIO',
    prefixo: 'MA-BCB-C001M',
    responsavel: 'DEILTON RIBEIRO',
    base: 'BCB',
    setor: 'OPERACIONAL',
    processo: 'GSTC',
    gerencia: 'AFONSO',
    servico: '',
    contrato: '',
    cc: '',
    imei: '',
  },
  RZT0J51: { prefixo: 'FISCAL OPERACIONAL', gerencia: 'AFONSO' },
  RZY1C45: { prefixo: 'FISCAL OPERACIONAL', responsavel: 'NONATO', gerencia: 'AFONSO' },
  SNJ9F39: { modelo: 'POLO TRACK', prefixo: 'SUPERVISOR OPERACIONAL', gerencia: 'AFONSO' },
  RZT0I21: { prefixo: 'FISCAL OPERACIONAL', responsavel: 'ADAILTON LIMA FERREIRA', gerencia: 'AFONSO' },
  RZT1A41: { prefixo: 'FISCAL OPERACIONAL', responsavel: 'GLEYSON', gerencia: 'AFONSO' },
  SNJ9F58: { modelo: 'POLO TRACK', prefixo: 'SUPERVISOR OPERACIONAL', responsavel: 'DEILTON RIBEIRO', gerencia: 'AFONSO' },
  SNW5B43: { prefixo: 'FISCAL OPERACIONAL', responsavel: 'LUCAS ALVES', setor: 'ADM', gerencia: 'AFONSO' },
  RZP0G64: { prefixo: 'FISCAL OPERACIONAL', responsavel: 'JORDEN CLEYSON', gerencia: 'AFONSO' },
  RZQ1B74: { prefixo: 'FISCAL OPERACIONAL', responsavel: 'RENATO RAMOS CARVALHO', gerencia: 'AFONSO' },
  SMP0E62: { modelo: 'POLO TRACK', prefixo: 'SUPERVISOR OPERACIONAL', responsavel: 'ARLISSON ROGERIO', gerencia: 'AFONSO' },
  RZY0G85: { prefixo: 'FISCAL OPERACIONAL', responsavel: 'EMANUEL', gerencia: 'AFONSO' },
}

const mod = await import('../src/data/totalVehiclesFleet.gen.ts')
const rows = [...mod.TOTAL_VEHICLE_ROWS]
const byPlaca = new Map(rows.map((r) => [r.placa, { ...r }]))

let updated = 0
for (const placa of AFONSO_PLACAS) {
  const row = byPlaca.get(placa)
  if (!row) continue
  row.gerencia = 'AFONSO'
  if (ROW_PATCHES[placa]) Object.assign(row, ROW_PATCHES[placa])
  updated += 1
}

for (const [placa, patch] of Object.entries(ROW_PATCHES)) {
  if (byPlaca.has(placa)) continue
  byPlaca.set(placa, patch)
  updated += 1
}

const out = [...byPlaca.values()].sort((a, b) => a.placa.localeCompare(b.placa))
const src = fs.readFileSync(dest, 'utf8')
const typeStart = src.indexOf('export type TotalVehicleSourceRow')
const rowsStart = src.indexOf('export const TOTAL_VEHICLE_ROWS')
const header = typeStart >= 0 && rowsStart > typeStart
  ? src.slice(0, typeStart)
  : `// Gerado por: node scripts/generate-total-vehicles-fleet.mjs\n// Patch AFONSO: ${new Date().toISOString()}\n`

const body =
  header +
  `export type TotalVehicleSourceRow = {\n` +
  `  placa: string\n` +
  `  ano: string\n` +
  `  modelo: string\n` +
  `  tipo: string\n` +
  `  proprietario: string\n` +
  `  prefixo: string\n` +
  `  responsavel: string\n` +
  `  base: string\n` +
  `  setor: string\n` +
  `  processo: string\n` +
  `  gerencia: string\n` +
  `  servico: string\n` +
  `  contrato: string\n` +
  `  cc: string\n` +
  `  imei: string\n` +
  `}\n` +
  `export const TOTAL_VEHICLE_ROWS: TotalVehicleSourceRow[] = ` +
  JSON.stringify(out, null, 2) +
  `\n`

fs.writeFileSync(dest, body, 'utf8')
console.log(`Atualizados/inseridos ${updated} veículos com gerência AFONSO.`)
