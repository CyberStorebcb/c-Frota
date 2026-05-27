/**
 * Lê FILTROS.xlsx e gera `src/data/officialFilters.gen.ts`.
 *
 * Uso:
 *   node scripts/generate-filter-options.mjs
 *   node scripts/generate-filter-options.mjs "C:\...\FILTROS.xlsx"
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const defaultInput =
  'C:/Users/Italo/OneDrive - GRUPO CGB/Área de Trabalho/FILTROS.xlsx'
const input = path.resolve(process.argv[2] || defaultInput)
const dest = path.join(__dirname, '../src/data/officialFilters.gen.ts')

if (!fs.existsSync(input)) {
  console.error(`Planilha não encontrada: ${input}`)
  process.exit(1)
}

const wb = XLSX.readFile(input)
const sheetName = wb.SheetNames.includes('FILTROS') ? 'FILTROS' : wb.SheetNames[0]
const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' })

const COL = { supervisor: 1, coordenador: 3, prefixo: 5, processo: 8 }

function clean(s) {
  return String(s ?? '').trim().replace(/\s+/g, ' ')
}

function upper(s) {
  return clean(s).toUpperCase()
}

function uniqSorted(set) {
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

const supervisors = new Set()
const coordenadores = new Set()
const prefixos = new Set()
const processos = new Set()

for (let i = 1; i < rows.length; i++) {
  const row = rows[i]
  const sup = upper(row[COL.supervisor])
  const coord = upper(row[COL.coordenador])
  const pref = upper(row[COL.prefixo])
  const proc = upper(row[COL.processo])
  if (sup) supervisors.add(sup)
  if (coord) coordenadores.add(coord)
  if (pref) prefixos.add(pref)
  if (proc) processos.add(proc)
}

const generatedAt = new Date().toISOString()

const out = `// Gerado por: node scripts/generate-filter-options.mjs
// Fonte: ${input.replace(/\\/g, '/')}
// Gerado em: ${generatedAt}

export const OFFICIAL_SUPERVISORS = ${JSON.stringify(uniqSorted(supervisors), null, 2)} as const

export const OFFICIAL_COORDENADORES = ${JSON.stringify(uniqSorted(coordenadores), null, 2)} as const

export const OFFICIAL_PREFIXOS = ${JSON.stringify(uniqSorted(prefixos), null, 2)} as const

export const OFFICIAL_PROCESSOS = ${JSON.stringify(uniqSorted(processos), null, 2)} as const
`

fs.writeFileSync(dest, out, 'utf8')

console.log(`Gerado: ${dest}`)
console.log(`  Supervisores: ${supervisors.size}`)
console.log(`  Gerências: ${coordenadores.size}`)
console.log(`  Prefixos: ${prefixos.size}`)
console.log(`  Processos: ${processos.size}`)
