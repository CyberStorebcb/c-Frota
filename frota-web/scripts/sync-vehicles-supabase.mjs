/**
 * Sincroniza veículos do catálogo embarcado (totalVehiclesFleet.gen.ts) com o Supabase.
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

const genFilePath = join(__dirname, '../src/data/totalVehiclesFleet.gen.ts')
const genFileContent = readFileSync(genFilePath, 'utf-8')

const match = genFileContent.match(/export const TOTAL_VEHICLE_ROWS[^=]+=\s*(\[[\s\S]*\])/)
if (!match) {
  console.error('Não foi possível extrair TOTAL_VEHICLE_ROWS do arquivo gerado.')
  process.exit(1)
}

const rows = JSON.parse(match[1])
console.log(`Total de veículos a sincronizar: ${rows.length}`)

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

const DESMOBILIZADO_FILE = join(__dirname, '../src/frota/fleetCatalogDesmobilizadoPlacas.ts')
const desmobContent = readFileSync(DESMOBILIZADO_FILE, 'utf-8')
const desmobMatch = desmobContent.match(/new Set\(\[([\s\S]*?)\]\)/)
const desmobPlacas = new Set(
  desmobMatch ? desmobMatch[1].match(/'([A-Z0-9]+)'/g)?.map(s => s.replace(/'/g, '')) ?? [] : []
)

const records = rows.map((row) => {
  const placa = normalizePlaca(row.placa)
  const isDesmob = desmobPlacas.has(placa)
  return {
    placa,
    modelo: (row.modelo || '—').trim().toUpperCase() || '—',
    tipo: normalizeVehicleTipo(row.tipo),
    prefixo: isDesmob ? 'DESMOBILIZADO' : normalizePrefixo(row.prefixo),
    responsavel: (row.responsavel || 'NÃO ATRIBUÍDO').trim().toUpperCase() || 'NÃO ATRIBUÍDO',
    supervisor: (row.responsavel || 'NÃO ATRIBUÍDO').trim().toUpperCase() || 'NÃO ATRIBUÍDO',
    coordenador: (row.gerencia || 'NÃO ATRIBUÍDO').trim().toUpperCase() || 'NÃO ATRIBUÍDO',
    base: (row.base || 'N/A').trim().toUpperCase() || 'N/A',
    ano: (row.ano || '').trim(),
    status: isDesmob ? 'INATIVO' : 'ATIVO',
  }
}).filter(r => r.placa && r.placa.length >= 7)

const seen = new Set()
const deduped = records.filter(r => {
  if (seen.has(r.placa)) return false
  seen.add(r.placa)
  return true
})

const afonsoCount = deduped.filter(r => r.coordenador === 'AFONSO').length
console.log(`Após deduplicação: ${deduped.length} registros (${afonsoCount} AFONSO)`)

const BATCH_SIZE = 100
let inserted = 0
let errors = 0

for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
  const batch = deduped.slice(i, i + BATCH_SIZE)
  const { error } = await supabase
    .from('vehicles')
    .upsert(batch, { onConflict: 'placa', ignoreDuplicates: false })

  if (error) {
    console.error(`Erro no lote ${i / BATCH_SIZE + 1}:`, error.message)
    errors += batch.length
  } else {
    inserted += batch.length
    process.stdout.write(`\rSincronizados: ${inserted}/${deduped.length}`)
  }
}

console.log(`\n\nConcluído: ${inserted} upserted, ${errors} erros.`)

const { count: afonsoDb } = await supabase
  .from('vehicles')
  .select('*', { count: 'exact', head: true })
  .eq('coordenador', 'AFONSO')

const { data: sample } = await supabase
  .from('vehicles')
  .select('placa,coordenador,responsavel,base')
  .eq('placa', 'RZT0J51')
  .maybeSingle()

console.log(`Verificação: ${afonsoDb} veículos com coordenador AFONSO no Supabase`)
console.log('Amostra RZT0J51:', sample)
