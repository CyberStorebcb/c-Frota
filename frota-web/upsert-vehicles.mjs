import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SUPABASE_URL = 'https://enljkobwspqkpokbxrwn.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVubGprb2J3c3Bxa3Bva2J4cnduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3OTg2OTYsImV4cCI6MjA5NTM3NDY5Nn0.OgKEYIoijraWkeEICJbinMmGfclV_gCmttAYkxXut9c'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const vehicles = JSON.parse(readFileSync('./vehicles_update.json', 'utf8'))

const rows = vehicles.map(v => ({
  placa: v.placa,
  modelo: v.modelo || '—',
  tipo: v.tipo,
  prefixo: v.prefixo || 'N/A',
  responsavel: v.responsavel || 'NÃO ATRIBUÍDO',
  supervisor: v.responsavel || 'NÃO ATRIBUÍDO',
  coordenador: 'NÃO ATRIBUÍDO',
  base: v.base || 'N/A',
  ano: v.ano || String(new Date().getFullYear()),
  status: 'ATIVO',
  em_manutencao: false,
  proprietario: v.proprietario || '',
  setor: v.setor || '',
  processo: v.processo || '',
}))

console.log(`Upserting ${rows.length} vehicles...`)

let ok = 0, fail = 0
const BATCH = 50
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH)
  const { data, error } = await supabase
    .from('vehicles')
    .upsert(batch, { onConflict: 'placa', ignoreDuplicates: false })
  if (error) {
    console.error(`Batch ${i}-${i+BATCH} error:`, error.message)
    fail += batch.length
  } else {
    ok += batch.length
    console.log(`Batch ${i+1}-${Math.min(i+BATCH, rows.length)}: OK`)
  }
}

console.log(`\nDone: ${ok} upserted, ${fail} failed`)
