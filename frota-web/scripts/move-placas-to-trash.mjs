/**
 * Move placas da lista de remoção do catálogo ativo para fleetTrash.gen.ts.
 * Uso: node scripts/move-placas-to-trash.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const genPath = join(__dirname, '../src/data/totalVehiclesFleet.gen.ts')
const trashPath = join(__dirname, '../src/data/fleetTrash.gen.ts')
const placasPath = join(__dirname, '../../placas_remover_catalogo_coluna.txt')
const ativoPath = join(__dirname, '../src/frota/fleetCatalogAtivoPlacas.ts')

function normPlaca(s) {
  return String(s || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)
}

const trashPlacas = readFileSync(placasPath, 'utf8')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && l !== 'PLACA')
  .map(normPlaca)
  .filter(Boolean)

const trashSet = new Set(trashPlacas)

const genRaw = readFileSync(genPath, 'utf8')
const headerMatch = genRaw.match(/^[\s\S]*?export const TOTAL_VEHICLE_ROWS[^=]+=\s*/)
if (!headerMatch) {
  console.error('Cabeçalho TOTAL_VEHICLE_ROWS não encontrado.')
  process.exit(1)
}
const header = headerMatch[0]
const arrayMatch = genRaw.match(/export const TOTAL_VEHICLE_ROWS[^=]+=\s*(\[[\s\S]*\])/)
if (!arrayMatch) {
  console.error('Array TOTAL_VEHICLE_ROWS não encontrado.')
  process.exit(1)
}

const allRows = JSON.parse(arrayMatch[1])
const trashRows = []
const activeRows = []

for (const row of allRows) {
  const p = normPlaca(row.placa)
  if (trashSet.has(p)) {
    trashRows.push({ ...row, placa: p === 'MOT' && row.placa.includes('*') ? row.placa : p || row.placa })
    trashSet.delete(p)
  } else {
    activeRows.push(row)
  }
}

if (trashSet.size > 0) {
  console.warn('Placas na lista mas não encontradas no catálogo:', [...trashSet].join(', '))
}

trashRows.sort((a, b) => normPlaca(a.placa).localeCompare(normPlaca(b.placa)))

const removedAt = new Date().toISOString()
const trashFile = `// Gerado por: node scripts/move-placas-to-trash.mjs
// Veículos removidos do catálogo ativo (visíveis só ao superadmin na lixeira).
// Removidos em: ${removedAt}
import type { TotalVehicleSourceRow } from './totalVehiclesFleet.gen'

export const FLEET_TRASH_REMOVED_AT = ${JSON.stringify(removedAt)}

export const FLEET_TRASH_ROWS: TotalVehicleSourceRow[] = ${JSON.stringify(trashRows, null, 2)}
`

writeFileSync(trashPath, trashFile, 'utf8')

const genHeader = header.replace(
  /\/\/ Fonte:[^\n]*\n/,
  `// Fonte: TOTAL DE VEICULOS.xlsx (ativos) | lixeira: fleetTrash.gen.ts\n`,
)
const typeAndHeader = genRaw.match(/^[\s\S]*?export type TotalVehicleSourceRow[\s\S]*?\}\n/)?.[0] ?? ''
const newGen =
  `// Gerado por: scripts/move-placas-to-trash.mjs\n` +
  `// Fonte: TOTAL DE VEICULOS.xlsx (ativos) | lixeira: fleetTrash.gen.ts (${trashRows.length} removidos)\n` +
  `// Patch gerência AFONSO: scripts/patch-afonso-gerencia.mjs\n` +
  typeAndHeader +
  `export const TOTAL_VEHICLE_ROWS: TotalVehicleSourceRow[] = ${JSON.stringify(activeRows, null, 2)}\n`

writeFileSync(genPath, newGen, 'utf8')

// Remove trash placas from FLEET_CATALOG_ATIVO_PLACAS
const ativoRaw = readFileSync(ativoPath, 'utf8')
const ativoMatch = ativoRaw.match(/=\s*new Set<string>\(\[(.*?)\]\)/s)
if (ativoMatch) {
  const placas = JSON.parse(`[${ativoMatch[1]}]`)
  const filtered = placas.filter((p) => !trashPlacas.includes(normPlaca(p))).sort()
  const newAtivo = ativoRaw.replace(
    /=\s*new Set<string>\(\[[\s\S]*?\]\)/,
    `= new Set<string>(${JSON.stringify(filtered)})`,
  )
  writeFileSync(ativoPath, newAtivo, 'utf8')
}

console.log(`Movidos para lixeira: ${trashRows.length}`)
console.log(`Catálogo ativo: ${activeRows.length}`)
console.log(`Arquivo lixeira: ${trashPath}`)
