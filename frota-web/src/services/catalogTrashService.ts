import { FLEET_TRASH_ROWS } from '../data/fleetTrash.gen'
import type { TotalVehicleSourceRow } from '../data/totalVehiclesFleet.gen'
import { TOTAL_VEHICLE_ROWS } from '../data/totalVehiclesFleet.gen'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { fetchAllSupabasePages } from '../lib/supabasePaginate'
import { normalizePlaca, VEHICLE_TYPE_IDS, type VehicleTipo } from '../frota/vehicleRegistry'

export const FLEET_RESTORED_FROM_TRASH_STORAGE_KEY = 'frota.vehicles.restoredFromCatalogTrash'
export const FLEET_CATALOG_TRASH_CHANGED_EVENT = 'frota-catalog-trash-changed'

function notifyCatalogTrashChanged(): void {
  window.dispatchEvent(new CustomEvent(FLEET_CATALOG_TRASH_CHANGED_EVENT))
}

function normalizeVehicleTipo(raw: string): VehicleTipo {
  const tipo = raw.trim().toUpperCase()
  if (tipo === 'SKY CS' || tipo === 'SKY CD') return 'SKY'
  if (tipo === 'VEICULO LEVE' || tipo === 'VEÍCULO LEVE') return 'VEICULOS LEVES'
  return VEHICLE_TYPE_IDS.includes(tipo as VehicleTipo) ? (tipo as VehicleTipo) : 'VEICULOS LEVES'
}

function normalizePrefixo(s: string): string {
  const t = s.trim().toUpperCase()
  return t || 'N/A'
}

export function readRestoredFromCatalogTrashPlacas(): Set<string> {
  try {
    const raw = localStorage.getItem(FLEET_RESTORED_FROM_TRASH_STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.map((p) => normalizePlaca(String(p))).filter(Boolean))
  } catch {
    return new Set()
  }
}

function writeRestoredFromCatalogTrashPlacas(placas: Set<string>): void {
  if (placas.size === 0) {
    localStorage.removeItem(FLEET_RESTORED_FROM_TRASH_STORAGE_KEY)
    return
  }
  localStorage.setItem(
    FLEET_RESTORED_FROM_TRASH_STORAGE_KEY,
    JSON.stringify([...placas].sort()),
  )
}

export function markCatalogTrashRestored(placa: string): void {
  const p = normalizePlaca(placa)
  if (!p) return
  const next = readRestoredFromCatalogTrashPlacas()
  next.add(p)
  writeRestoredFromCatalogTrashPlacas(next)
  notifyCatalogTrashChanged()
}

export function isCatalogTrashRestored(placa: string): boolean {
  return readRestoredFromCatalogTrashPlacas().has(normalizePlaca(placa))
}

export function getTrashRowByPlaca(placa: string): TotalVehicleSourceRow | undefined {
  const target = normalizePlaca(placa)
  if (!target) return undefined
  return FLEET_TRASH_ROWS.find((row) => normalizePlaca(row.placa) === target)
}

export function getRestoredTrashCatalogRows(): TotalVehicleSourceRow[] {
  const restored = readRestoredFromCatalogTrashPlacas()
  return FLEET_TRASH_ROWS.filter((row) => restored.has(normalizePlaca(row.placa)))
}

export function catalogRowToSupabaseRecord(row: TotalVehicleSourceRow, deletedAt: string | null) {
  const placa = normalizePlaca(row.placa) || row.placa.trim().toUpperCase()
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
    status: 'INATIVO',
    deleted_at: deletedAt,
  }
}

async function upsertVehicleByPlaca(
  row: ReturnType<typeof catalogRowToSupabaseRecord>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: existing, error: findError } = await supabase
    .from('vehicles')
    .select('id')
    .eq('placa', row.placa)
    .maybeSingle()

  if (findError) return { ok: false, message: findError.message }

  if (existing?.id) {
    const { error } = await supabase.from('vehicles').update(row).eq('id', existing.id)
    if (error) return { ok: false, message: error.message }
    return { ok: true }
  }

  const { error } = await supabase.from('vehicles').insert(row)
  if (error) {
    if (error.code === '23505') {
      const { error: updateError } = await supabase
        .from('vehicles')
        .update(row)
        .eq('placa', row.placa)
      if (updateError) return { ok: false, message: updateError.message }
      return { ok: true }
    }
    return { ok: false, message: error.message }
  }
  return { ok: true }
}

export async function restoreCatalogVehicleFromTrash(
  placa: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!supabaseConfigured) {
    return { ok: false, message: 'Supabase não configurado.' }
  }

  const row = getTrashRowByPlaca(placa)
  if (!row) return { ok: false, message: 'Veículo não encontrado na lixeira do catálogo.' }

  const record = catalogRowToSupabaseRecord(row, null)
  record.status = 'ATIVO'

  const res = await upsertVehicleByPlaca(record)
  if (!res.ok) return res

  markCatalogTrashRestored(placa)
  return { ok: true }
}

export type CatalogTrashSyncStats = {
  activeUpserted: number
  trashMarked: number
  errors: number
}

export async function syncCatalogTrashWithSupabase(): Promise<
  { ok: true; stats: CatalogTrashSyncStats } | { ok: false; message: string; stats?: CatalogTrashSyncStats }
> {
  if (!supabaseConfigured) {
    return { ok: false, message: 'Supabase não configurado.' }
  }

  const restored = readRestoredFromCatalogTrashPlacas()
  const deletedAt = new Date().toISOString()
  const stats: CatalogTrashSyncStats = { activeUpserted: 0, trashMarked: 0, errors: 0 }

  for (const row of TOTAL_VEHICLE_ROWS) {
    const placa = normalizePlaca(row.placa)
    if (!placa) continue
    const record = catalogRowToSupabaseRecord(row, null)
    record.status = 'ATIVO'
    const res = await upsertVehicleByPlaca(record)
    if (res.ok) stats.activeUpserted += 1
    else stats.errors += 1
  }

  for (const row of FLEET_TRASH_ROWS) {
    const placa = normalizePlaca(row.placa)
    if (!placa || restored.has(placa)) continue
    const record = catalogRowToSupabaseRecord(row, deletedAt)
    const res = await upsertVehicleByPlaca(record)
    if (res.ok) stats.trashMarked += 1
    else stats.errors += 1
  }

  notifyCatalogTrashChanged()

  if (stats.errors > 0 && stats.activeUpserted + stats.trashMarked === 0) {
    return { ok: false, message: 'Falha ao sincronizar lixeira com o Supabase.', stats }
  }

  return { ok: true, stats }
}

/** Placas restauradas no Supabase (deleted_at nulo) mas ainda na lixeira embebida. */
export async function hydrateRestoredPlacasFromSupabase(): Promise<void> {
  if (!supabaseConfigured) return

  const trashPlacas = FLEET_TRASH_ROWS.map((r) => normalizePlaca(r.placa)).filter(Boolean)
  if (trashPlacas.length === 0) return

  const { data, error } = await fetchAllSupabasePages((from, to) =>
    supabase
      .from('vehicles')
      .select('placa')
      .in('placa', trashPlacas)
      .is('deleted_at', null)
      .range(from, to),
  )

  if (error || !data?.length) return

  const local = readRestoredFromCatalogTrashPlacas()
  let changed = false
  for (const row of data as { placa: string }[]) {
    const p = normalizePlaca(row.placa)
    if (!p || local.has(p)) continue
    local.add(p)
    changed = true
  }
  if (changed) writeRestoredFromCatalogTrashPlacas(local)
}
