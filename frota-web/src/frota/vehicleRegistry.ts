import { isAccessArea, type AccessArea } from '../access/accessAreas'
import { TOTAL_VEHICLE_ROWS, type TotalVehicleSourceRow } from '../data/totalVehiclesFleet.gen'
import { FLEET_CATALOG_ATIVO_PLACAS } from './fleetCatalogAtivoPlacas'
import { FLEET_CATALOG_DESMOBILIZADO_PLACAS } from './fleetCatalogDesmobilizadoPlacas'

const STORAGE_KEY = 'frota.vehicles.registry'
/** Estado ativo/inativo para placas só do catálogo (cadastro local usa o registo principal). */
export const FLEET_STATUS_BY_PLACA_STORAGE_KEY = 'frota.vehicles.statusByPlaca'
/** Flag de manutenção independente (por placa, para catálogo e locais). */
export const FLEET_MANUTENCAO_BY_PLACA_STORAGE_KEY = 'frota.vehicles.manutencaoByPlaca'

export type VehicleStatus = 'ATIVO' | 'INATIVO'

export type FleetVehicle = {
  id: string
  placa: string
  modelo: string
  tipo: VehicleTipo
  prefixo: string
  responsavel: string
  supervisor: string
  coordenador: string
  base: string
  status: VehicleStatus
  emManutencao: boolean
  ano: string
  createdAt: string
  /** Origem: planilha total embebida ou cadastro em `localStorage`. */
  source?: 'total' | 'local'
}

export type AddFleetVehicleInput = {
  placa: string
  modelo: string
  tipo: VehicleTipo
  prefixo: string
  responsavel: string
  supervisor: string
  coordenador: string
  base: string
  ano: string
}

function parseStatusValue(raw: unknown): VehicleStatus {
  const s = String(raw ?? 'ATIVO').toUpperCase()
  // Legacy: OPERACIONAL → ATIVO; MANUTENÇÃO tratado pelo emManutencao
  if (s === 'INATIVO') return 'INATIVO'
  return 'ATIVO'
}

function readStatusByPlaca(): Record<string, VehicleStatus> {
  try {
    const raw = localStorage.getItem(FLEET_STATUS_BY_PLACA_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    const out: Record<string, VehicleStatus> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const p = normalizePlaca(k)
      if (!p) continue
      out[p] = parseStatusValue(v)
    }
    return out
  } catch {
    return {}
  }
}

function writeStatusByPlaca(map: Record<string, VehicleStatus>): void {
  const keys = Object.keys(map)
  if (keys.length === 0) {
    localStorage.removeItem(FLEET_STATUS_BY_PLACA_STORAGE_KEY)
    return
  }
  localStorage.setItem(FLEET_STATUS_BY_PLACA_STORAGE_KEY, JSON.stringify(map))
}

function readManutencaoByPlaca(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(FLEET_MANUTENCAO_BY_PLACA_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    const out: Record<string, boolean> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const p = normalizePlaca(k)
      if (!p) continue
      out[p] = Boolean(v)
    }
    return out
  } catch {
    return {}
  }
}

function writeManutencaoByPlaca(map: Record<string, boolean>): void {
  const keys = Object.keys(map).filter((k) => map[k])
  const cleaned: Record<string, boolean> = {}
  for (const k of keys) cleaned[k] = true
  if (keys.length === 0) {
    localStorage.removeItem(FLEET_MANUTENCAO_BY_PLACA_STORAGE_KEY)
    return
  }
  localStorage.setItem(FLEET_MANUTENCAO_BY_PLACA_STORAGE_KEY, JSON.stringify(cleaned))
}

/**
 * Atualiza o estado ativo/inativo do veículo (cadastro local ou overlay por placa do catálogo).
 */
export function setFleetVehicleStatus(placa: string, status: VehicleStatus): void {
  const p = normalizePlaca(placa)
  if (!p) return

  const locals = readFleetVehicles()
  const idx = locals.findIndex((v) => v.placa === p)
  if (idx >= 0) {
    const next = [...locals]
    next[idx] = { ...next[idx], status }
    writeFleetVehicles(next)
    return
  }

  const byPlaca = readStatusByPlaca()
  if (status === 'ATIVO') {
    delete byPlaca[p]
  } else {
    byPlaca[p] = status
  }
  writeStatusByPlaca(byPlaca)
}

/**
 * Atualiza o flag de manutenção do veículo (independente do status ativo/inativo).
 */
export function setFleetVehicleManutencao(placa: string, emManutencao: boolean): void {
  const p = normalizePlaca(placa)
  if (!p) return

  // Atualiza cadastro local se existir
  const locals = readFleetVehicles()
  const idx = locals.findIndex((v) => v.placa === p)
  if (idx >= 0) {
    const next = [...locals]
    next[idx] = { ...next[idx], emManutencao }
    writeFleetVehicles(next)
    return
  }

  // Overlay para catálogo
  const byPlaca = readManutencaoByPlaca()
  if (!emManutencao) {
    delete byPlaca[p]
  } else {
    byPlaca[p] = true
  }
  writeManutencaoByPlaca(byPlaca)
}

/** IDs de tipo alinhados aos CSVs / UI de controlo de frota. */
export const VEHICLE_TYPE_IDS = [
  'MUNCK',
  'SKY',
  'MOTO',
  'PICAPE 4X4',
  'PICAPE LEVE',
  'VEICULOS LEVES',
  'CARRETA',
  'CAMINHÃO',
  'OFICINA',
  'MOTOPODA',
] as const

export type VehicleTipo = (typeof VEHICLE_TYPE_IDS)[number]

function isVehicleTipo(s: string): s is VehicleTipo {
  return VEHICLE_TYPE_IDS.includes(s as VehicleTipo)
}

function legacyAreaToTipo(area: string): VehicleTipo {
  if (!isAccessArea(area)) return 'VEICULOS LEVES'
  const map: Record<AccessArea, VehicleTipo> = {
    TODAS: 'VEICULOS LEVES',
    SKY: 'SKY',
    MUNK: 'MUNCK',
    MOTO: 'MOTO',
    PICAPE_4X4: 'PICAPE 4X4',
    PICAPE_LEVE: 'PICAPE LEVE',
    VEICULOS_LEVES: 'VEICULOS LEVES',
  }
  return map[area]
}

export function normalizePlaca(s: string): string {
  return s.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)
}

export function formatPlaca(s: string): string {
  const p = normalizePlaca(s)
  if (/^[A-Z]{3}\d{4}$/.test(p)) return `${p.slice(0, 3)}-${p.slice(3)}`
  return p
}

function normalizePrefixo(s: string): string {
  const t = s.trim().toUpperCase()
  return t || 'N/A'
}

function newVehicleId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `veh-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function normalizeVehicleTipo(raw: string): VehicleTipo {
  const tipo = raw.trim().toUpperCase()
  if (tipo === 'SKY CS' || tipo === 'SKY CD') return 'SKY'
  if (tipo === 'VEICULO LEVE' || tipo === 'VEÍCULO LEVE') return 'VEICULOS LEVES'
  return isVehicleTipo(tipo) ? tipo : 'VEICULOS LEVES'
}

function totalRowToFleetVehicle(row: TotalVehicleSourceRow): FleetVehicle {
  const placa = normalizePlaca(row.placa)
  const desmob = FLEET_CATALOG_DESMOBILIZADO_PLACAS.has(placa)
  const prefixo = desmob ? 'DESMOBILIZADO' : normalizePrefixo(row.prefixo)
  const status: VehicleStatus =
    desmob ? 'INATIVO' : FLEET_CATALOG_ATIVO_PLACAS.has(placa) ? 'ATIVO' : 'INATIVO'
  return {
    id: `total-${placa}`,
    placa,
    modelo: (row.modelo || '—').trim().toUpperCase() || '—',
    tipo: normalizeVehicleTipo(row.tipo),
    prefixo,
    responsavel: (row.responsavel || row.processo || '—').trim().toUpperCase() || '—',
    supervisor: (row.gerencia || 'NÃO ATRIBUÍDO').trim().toUpperCase() || 'NÃO ATRIBUÍDO',
    coordenador: (row.setor || 'NÃO ATRIBUÍDO').trim().toUpperCase() || 'NÃO ATRIBUÍDO',
    base: (row.base || 'N/A').trim().toUpperCase() || 'N/A',
    status,
    emManutencao: false,
    ano: (row.ano || '').trim(),
    createdAt: '1970-01-01T00:00:00.000Z',
    source: 'total',
  }
}

/** Base total embebida da planilha fundida com `localStorage` (cadastro local prevalece na mesma placa). */
export function getDisplayedFleetVehicles(): FleetVehicle[] {
  const map = new Map<string, FleetVehicle>()

  for (const row of TOTAL_VEHICLE_ROWS) {
    const p = normalizePlaca(row.placa)
    if (!p) continue
    map.set(p, totalRowToFleetVehicle(row))
  }

  const locals = readFleetVehicles()
  const localPlacas = new Set(locals.map((v) => v.placa))
  for (const v of locals) {
    map.set(v.placa, { ...v, source: 'local' })
  }

  const statusByPlaca = readStatusByPlaca()
  for (const [placaKey, st] of Object.entries(statusByPlaca)) {
    const p = normalizePlaca(placaKey)
    if (!p || localPlacas.has(p)) continue
    const cur = map.get(p)
    if (!cur) continue
    map.set(p, { ...cur, status: st })
  }

  const manutencaoByPlaca = readManutencaoByPlaca()
  for (const [placaKey, val] of Object.entries(manutencaoByPlaca)) {
    const p = normalizePlaca(placaKey)
    if (!p || localPlacas.has(p)) continue
    const cur = map.get(p)
    if (!cur) continue
    map.set(p, { ...cur, emManutencao: val })
  }

  return [...map.values()].sort((a, b) => a.placa.localeCompare(b.placa))
}

function placaExistsInTotalCatalog(placa: string): boolean {
  const p = normalizePlaca(placa)
  return TOTAL_VEHICLE_ROWS.some((r) => normalizePlaca(r.placa) === p)
}

/** Quantidade de placas distintas na base total embebida (TOTAL DE VEICULOS.xlsx deduplicado). */
export const TOTAL_VEHICLE_CATALOG_UNIQUE_COUNT = TOTAL_VEHICLE_ROWS.length

function parseRow(x: Record<string, unknown>): FleetVehicle | null {
  const placa = normalizePlaca(String(x.placa ?? ''))
  if (!placa) return null

  const tipoRaw = String(x.tipo ?? '')
  const tipo: VehicleTipo = isVehicleTipo(tipoRaw)
    ? tipoRaw
    : legacyAreaToTipo(String((x as { area?: unknown }).area ?? ''))

  const status: VehicleStatus = parseStatusValue(x.status)

  // Legacy: se status era MANUTENÇÃO, converter para ATIVO + emManutencao=true
  const rawStatus = String(x.status ?? '').toUpperCase()
  const emManutencao: boolean =
    rawStatus === 'MANUTENÇÃO' || rawStatus === 'MANUTENCAO'
      ? true
      : Boolean(x.emManutencao)

  const prefixo = normalizePrefixo(String(x.prefixo ?? ''))
  const modelo = String(x.modelo ?? '').trim() || '—'
  const responsavel = String(x.responsavel ?? '').trim() || 'NÃO ATRIBUÍDO'
  const supervisor = String(x.supervisor ?? '').trim() || 'NÃO ATRIBUÍDO'
  const coordenador = String(x.coordenador ?? '').trim() || 'NÃO ATRIBUÍDO'
  const base = String(x.base ?? '').trim().toUpperCase() || 'N/A'
  const ano = String(x.ano ?? '').trim() || new Date().getFullYear().toString()

  const rawSource = x.source
  const src: FleetVehicle['source'] | undefined =
    rawSource === 'local' ||
    rawSource === 'total'
      ? rawSource
      : undefined

  return {
    id: typeof x.id === 'string' ? x.id : typeof x.id === 'number' ? String(x.id) : newVehicleId(),
    placa,
    modelo,
    tipo,
    prefixo,
    responsavel,
    supervisor,
    coordenador,
    base,
    status,
    emManutencao,
    ano,
    createdAt: typeof x.createdAt === 'string' ? x.createdAt : new Date().toISOString(),
    source: src,
  }
}

export function readFleetVehicles(): FleetVehicle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object' && x !== null)
      .map((x) => parseRow(x))
      .filter((v): v is FleetVehicle => v !== null)
  } catch {
    return []
  }
}

function writeFleetVehicles(list: FleetVehicle[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function labelVeiculo(v: FleetVehicle): string {
  return `${formatPlaca(v.placa)} · ${v.modelo}`
}

export function addFleetVehicle(
  input: AddFleetVehicleInput,
): { ok: true } | { ok: false; message: string } {
  const pl = normalizePlaca(input.placa)
  const modelo = input.modelo.trim()
  if (!pl) return { ok: false, message: 'Informe a placa.' }
  if (!modelo) return { ok: false, message: 'Informe o modelo / marca.' }

  const list = readFleetVehicles()
  if (list.some((v) => v.placa === pl)) {
    return { ok: false, message: 'Já existe um veículo com esta placa.' }
  }

  if (placaExistsInTotalCatalog(pl)) {
    return { ok: false, message: 'Esta placa já consta na base total de veículos.' }
  }

  const prefixo = normalizePrefixo(input.prefixo)
  const responsavel = input.responsavel.trim() ? input.responsavel.trim().toUpperCase() : 'NÃO ATRIBUÍDO'
  const supervisor = input.supervisor.trim() ? input.supervisor.trim().toUpperCase() : 'NÃO ATRIBUÍDO'
  const coordenador = input.coordenador.trim() ? input.coordenador.trim().toUpperCase() : 'NÃO ATRIBUÍDO'
  const base = input.base.trim() ? input.base.trim().toUpperCase() : 'N/A'
  const ano = input.ano.trim() || new Date().getFullYear().toString()

  writeFleetVehicles([
    ...list,
    {
      id: newVehicleId(),
      placa: pl,
      modelo: modelo.toUpperCase(),
      tipo: input.tipo,
      prefixo,
      responsavel,
      supervisor,
      coordenador,
      base,
      status: 'ATIVO',
      emManutencao: false,
      ano,
      createdAt: new Date().toISOString(),
      source: 'local',
    },
  ])
  return { ok: true }
}

/** Veículo gerado a partir dos ficheiros embebidos (não removível pelo menu). */
export function isEmbeddedCatalogFleetVehicleId(id: string): boolean {
  return id.startsWith('total-')
}

export function removeFleetVehicle(id: string): void {
  if (isEmbeddedCatalogFleetVehicleId(id)) return
  writeFleetVehicles(readFleetVehicles().filter((v) => v.id !== id))
}
