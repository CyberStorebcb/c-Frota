/**
 * Sincroniza veículos do catálogo embarcado (totalVehiclesFleet.gen.ts) com o Supabase.
 * Marca veículos da lixeira (fleetTrash.gen.ts) com deleted_at.
 * Usa upsert por placa — seguro rodar múltiplas vezes.
 *
 * Uso:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync-vehicles-supabase.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://enljkobwspqkpokbxrwn.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('Defina SUPABASE_SERVICE_ROLE_KEY (Dashboard → Settings → API → service_role).')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

function extractJsonArray(filePath, exportName) {
  const content = readFileSync(filePath, 'utf-8')
  const match = content.match(new RegExp(`export const ${exportName}[^=]+=\\s*(\\[[\\s\\S]*\\])`))
  if (!match) {
    console.error(`Não foi possível extrair ${exportName} de ${filePath}`)
    process.exit(1)
  }
  return JSON.parse(match[1])
}

const genFilePath = join(__dirname, '../src/data/totalVehiclesFleet.gen.ts')
const trashFilePath = join(__dirname, '../src/data/fleetTrash.gen.ts')

const rows = extractJsonArray(genFilePath, 'TOTAL_VEHICLE_ROWS')
const trashRows = extractJsonArray(trashFilePath, 'FLEET_TRASH_ROWS')

console.log(`Catálogo ativo: ${rows.length} veículos`)
console.log(`Lixeira: ${trashRows.length} veículos`)

const VEHICLE_TYPE_IDS = [
  'MUNCK', 'SKY', 'MOTO', 'PICAPE 4X4', 'PICAPE LEVE',
  'VEICULOS LEVES', 'CARRETA', 'CAMINHÃO', 'OFICINA', 'MOTOPODA',
]

function normalizePlaca(s) {
  return s.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)
}

function normalizeVehicleTipo(raw) {
  const tipo = raw.trim().toUpperCase()
  if (tipo === 'SKY CS' || tipo === 'SKY CD') return 'SKY'
  if (tipo === 'VEICULO LEVE' || tipo === 'VEÍCULO LEVE') return 'VEICULOS LEVES'
  return VEHICLE_TYPE_IDS.includes(tipo) ? tipo : 'VEICULOS LEVES'
}

function normalizePrefixo(s) {
  const t = s.trim().toUpperCase()
  return t || 'N/A'
}

function rowToRecord(row, { deletedAt, status }) {
  const placa = normalizePlaca(row.placa)
  const responsavel = (row.responsavel || 'NÃO ATRIBUÍDO').trim().toUpperCase() || 'NÃO ATRIBUÍDO'
  return {
    placa,
    modelo: (row.modelo || '—').trim().toUpperCase() || '—',
    tipo: normalizeVehicleTipo(row.tipo),
    prefixo: normalizePrefixo(row.prefixo),
    responsavel,
    supervisor: responsavel,
    coordenador: (row.gerencia || 'NÃO ATRIBUÍDO').trim().toUpperCase() || 'NÃO ATRIBUÍDO',
    base: (row.base || 'N/A').trim().toUpperCase() || 'N/A',
    ano: (row.ano || '').trim(),
    status,
    deleted_at: deletedAt,
  }
}

const DESMOBILIZADO_FILE = join(__dirname, '../src/frota/fleetCatalogDesmobilizadoPlacas.ts')
const desmobContent = readFileSync(DESMOBILIZADO_FILE, 'utf-8')
const desmobMatch = desmobContent.match(/new Set\(\[([\s\S]*?)\]\)/)
const desmobPlacas = new Set(
  desmobMatch ? desmobMatch[1].match(/'([A-Z0-9]+)'/g)?.map(s => s.replace(/'/g, '')) ?? [] : []
)

const deletedAt = new Date().toISOString()

const activeRecords = rows
  .map((row) => {
    const placa = normalizePlaca(row.placa)
    const isDesmob = desmobPlacas.has(placa)
    const rec = rowToRecord(row, { deletedAt: null, status: isDesmob ? 'INATIVO' : 'ATIVO' })
    if (isDesmob) rec.prefixo = 'DESMOBILIZADO'
    return rec
  })
  .filter((r) => r.placa)

const trashRecords = trashRows
  .map((row) => rowToRecord(row, { deletedAt, status: 'INATIVO' }))
  .filter((r) => r.placa)

function dedupeByPlaca(list) {
  const seen = new Set()
  return list.filter((r) => {
    if (seen.has(r.placa)) return false
    seen.add(r.placa)
    return true
  })
}

const dedupedActive = dedupeByPlaca(activeRecords)
const dedupedTrash = dedupeByPlaca(trashRecords)
const allRecords = [...dedupedActive, ...dedupedTrash]

console.log(`Upsert total: ${allRecords.length} (${dedupedActive.length} ativos + ${dedupedTrash.length} lixeira)`)

const BATCH_SIZE = 100
let inserted = 0
let errors = 0

for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
  const batch = allRecords.slice(i, i + BATCH_SIZE)
  const { error } = await supabase
    .from('vehicles')
    .upsert(batch, { onConflict: 'placa', ignoreDuplicates: false })

  if (error) {
    console.error(`Erro no lote ${i / BATCH_SIZE + 1}:`, error.message)
    errors += batch.length
  } else {
    inserted += batch.length
    process.stdout.write(`\rSincronizados: ${inserted}/${allRecords.length}`)
  }
}

console.log(`\n\nConcluído: ${inserted} upserted, ${errors} erros.`)

const { count: trashDb } = await supabase
  .from('vehicles')
  .select('*', { count: 'exact', head: true })
  .not('deleted_at', 'is', null)

const { count: activeDb } = await supabase
  .from('vehicles')
  .select('*', { count: 'exact', head: true })
  .is('deleted_at', null)

console.log(`Verificação Supabase: ${activeDb ?? '?'} ativos, ${trashDb ?? '?'} na lixeira (deleted_at)`)
