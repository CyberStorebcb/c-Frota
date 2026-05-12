import { isAccessArea, type AccessArea } from '../access/accessAreas'
import { MOTO_FLEET_ROWS, type MotoFleetSourceRow } from '../data/motoFleet.gen'
import { MUNCK_FLEET_ROWS, type MunckFleetSourceRow } from '../data/munckFleet.gen'
import { PICAPE_4X4_FLEET_ROWS, type Picape4x4FleetSourceRow } from '../data/picape4x4Fleet.gen'
import { PICAPE_LEVE_FLEET_ROWS, type PicapeLeveFleetSourceRow } from '../data/picapeLeveFleet.gen'
import { SKY_FLEET_ROWS, type SkyFleetSourceRow } from '../data/skyFleet.gen'
import { VEICULOS_LEVES_FLEET_ROWS, type VeiculosLevesFleetSourceRow } from '../data/veiculosLevesFleet.gen'

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
  /** Origem: bases embebidas (SKY / Munck / Moto / Picapes / veículos leves) ou cadastro em `localStorage`. */
  source?: 'sky' | 'munck' | 'moto' | 'picape4x4' | 'picapeleve' | 'veiculosleves' | 'local'
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

function normalizePlaca(s: string): string {
  return s.trim().toUpperCase()
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

function skyRowToFleetVehicle(row: SkyFleetSourceRow): FleetVehicle {
  const placa = normalizePlaca(row.placa)
  return {
    id: `sky-${placa}`,
    placa,
    modelo: (row.modelo || '—').trim().toUpperCase() || '—',
    tipo: 'SKY',
    prefixo: normalizePrefixo(row.prefixo),
    responsavel: (row.processo || '—').trim().toUpperCase() || '—',
    supervisor: 'NÃO ATRIBUÍDO',
    coordenador: 'NÃO ATRIBUÍDO',
    base: (row.localidade || 'N/A').trim() || 'N/A',
    status: 'ATIVO',
    emManutencao: false,
    ano: '',
    createdAt: '1970-01-01T00:00:00.000Z',
    source: 'sky',
  }
}

function munckRowToFleetVehicle(row: MunckFleetSourceRow): FleetVehicle {
  const placa = normalizePlaca(row.placa)
  return {
    id: `munck-${placa}`,
    placa,
    modelo: (row.modelo || '—').trim().toUpperCase() || '—',
    tipo: 'MUNCK',
    prefixo: 'N/A',
    responsavel: (row.processo || '—').trim().toUpperCase() || '—',
    supervisor: 'NÃO ATRIBUÍDO',
    coordenador: 'NÃO ATRIBUÍDO',
    base: (row.localidade || 'N/A').trim() || 'N/A',
    status: 'ATIVO',
    emManutencao: false,
    ano: '',
    createdAt: '1970-01-02T00:00:00.000Z',
    source: 'munck',
  }
}

function motoRowToFleetVehicle(row: MotoFleetSourceRow): FleetVehicle {
  const placa = normalizePlaca(row.placa)
  return {
    id: `moto-${placa}`,
    placa,
    modelo: (row.modelo || '—').trim().toUpperCase() || '—',
    tipo: 'MOTO',
    prefixo: normalizePrefixo(row.prefixo),
    responsavel: (row.processo || '—').trim().toUpperCase() || '—',
    supervisor: 'NÃO ATRIBUÍDO',
    coordenador: 'NÃO ATRIBUÍDO',
    base: (row.localidade || 'N/A').trim() || 'N/A',
    status: 'ATIVO',
    emManutencao: false,
    ano: '',
    createdAt: '1970-01-03T00:00:00.000Z',
    source: 'moto',
  }
}

function picape4x4RowToFleetVehicle(row: Picape4x4FleetSourceRow): FleetVehicle {
  const placa = normalizePlaca(row.placa)
  return {
    id: `picape4x4-${placa}`,
    placa,
    modelo: (row.modelo || '—').trim().toUpperCase() || '—',
    tipo: 'PICAPE 4X4',
    prefixo: normalizePrefixo(row.prefixo),
    responsavel: (row.processo || '—').trim().toUpperCase() || '—',
    supervisor: 'NÃO ATRIBUÍDO',
    coordenador: 'NÃO ATRIBUÍDO',
    base: (row.localidade || 'N/A').trim() || 'N/A',
    status: 'ATIVO',
    emManutencao: false,
    ano: '',
    createdAt: '1970-01-04T00:00:00.000Z',
    source: 'picape4x4',
  }
}

function picapeLeveRowToFleetVehicle(row: PicapeLeveFleetSourceRow): FleetVehicle {
  const placa = normalizePlaca(row.placa)
  return {
    id: `picapeleve-${placa}`,
    placa,
    modelo: (row.modelo || '—').trim().toUpperCase() || '—',
    tipo: 'PICAPE LEVE',
    prefixo: normalizePrefixo(row.prefixo),
    responsavel: (row.processo || '—').trim().toUpperCase() || '—',
    supervisor: 'NÃO ATRIBUÍDO',
    coordenador: 'NÃO ATRIBUÍDO',
    base: (row.localidade || 'N/A').trim() || 'N/A',
    status: 'ATIVO',
    emManutencao: false,
    ano: '',
    createdAt: '1970-01-05T00:00:00.000Z',
    source: 'picapeleve',
  }
}

function veiculosLevesRowToFleetVehicle(row: VeiculosLevesFleetSourceRow): FleetVehicle {
  const placa = normalizePlaca(row.placa)
  return {
    id: `veiculosleves-${placa}`,
    placa,
    modelo: (row.modelo || '—').trim().toUpperCase() || '—',
    tipo: 'VEICULOS LEVES',
    prefixo: normalizePrefixo(row.prefixo),
    responsavel: (row.processo || '—').trim().toUpperCase() || '—',
    supervisor: 'NÃO ATRIBUÍDO',
    coordenador: 'NÃO ATRIBUÍDO',
    base: (row.localidade || 'N/A').trim() || 'N/A',
    status: 'ATIVO',
    emManutencao: false,
    ano: '',
    createdAt: '1970-01-06T00:00:00.000Z',
    source: 'veiculosleves',
  }
}

/** Bases embebidas (ficheiros deduplicados) fundidas com `localStorage` (cadastro local prevalece na mesma placa). */
export function getDisplayedFleetVehicles(): FleetVehicle[] {
  const map = new Map<string, FleetVehicle>()

  for (const row of SKY_FLEET_ROWS) {
    const p = normalizePlaca(row.placa)
    if (!p) continue
    map.set(p, skyRowToFleetVehicle(row))
  }

  for (const row of MUNCK_FLEET_ROWS) {
    const p = normalizePlaca(row.placa)
    if (!p) continue
    map.set(p, munckRowToFleetVehicle(row))
  }

  for (const row of MOTO_FLEET_ROWS) {
    const p = normalizePlaca(row.placa)
    if (!p) continue
    map.set(p, motoRowToFleetVehicle(row))
  }

  for (const row of PICAPE_4X4_FLEET_ROWS) {
    const p = normalizePlaca(row.placa)
    if (!p) continue
    map.set(p, picape4x4RowToFleetVehicle(row))
  }

  for (const row of PICAPE_LEVE_FLEET_ROWS) {
    const p = normalizePlaca(row.placa)
    if (!p) continue
    map.set(p, picapeLeveRowToFleetVehicle(row))
  }

  for (const row of VEICULOS_LEVES_FLEET_ROWS) {
    const p = normalizePlaca(row.placa)
    if (!p) continue
    map.set(p, veiculosLevesRowToFleetVehicle(row))
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

function placaExistsInSkyCatalog(placa: string): boolean {
  const p = normalizePlaca(placa)
  return SKY_FLEET_ROWS.some((r) => normalizePlaca(r.placa) === p)
}

function placaExistsInMunckCatalog(placa: string): boolean {
  const p = normalizePlaca(placa)
  return MUNCK_FLEET_ROWS.some((r) => normalizePlaca(r.placa) === p)
}

function placaExistsInMotoCatalog(placa: string): boolean {
  const p = normalizePlaca(placa)
  return MOTO_FLEET_ROWS.some((r) => normalizePlaca(r.placa) === p)
}

function placaExistsInPicape4x4Catalog(placa: string): boolean {
  const p = normalizePlaca(placa)
  return PICAPE_4X4_FLEET_ROWS.some((r) => normalizePlaca(r.placa) === p)
}

function placaExistsInPicapeLeveCatalog(placa: string): boolean {
  const p = normalizePlaca(placa)
  return PICAPE_LEVE_FLEET_ROWS.some((r) => normalizePlaca(r.placa) === p)
}

function placaExistsInVeiculosLevesCatalog(placa: string): boolean {
  const p = normalizePlaca(placa)
  return VEICULOS_LEVES_FLEET_ROWS.some((r) => normalizePlaca(r.placa) === p)
}

/** Quantidade de placas distintas na base SKY embebida (sky.txt deduplicado). */
export const SKY_CATALOG_UNIQUE_COUNT = SKY_FLEET_ROWS.length

/** Quantidade de placas distintas na base Munck embebida (MUNCK.txt deduplicado). */
export const MUNCK_CATALOG_UNIQUE_COUNT = MUNCK_FLEET_ROWS.length

/** Quantidade de placas distintas na base Moto embebida (Moto.txt deduplicado). */
export const MOTO_CATALOG_UNIQUE_COUNT = MOTO_FLEET_ROWS.length

/** Quantidade de placas distintas na base Picape 4x4 embebida (PICAPE 4X4.txt deduplicado). */
export const PICAPE_4X4_CATALOG_UNIQUE_COUNT = PICAPE_4X4_FLEET_ROWS.length

/** Quantidade de placas distintas na base Picape leve embebida (PICAPE LEVE.txt deduplicado). */
export const PICAPE_LEVE_CATALOG_UNIQUE_COUNT = PICAPE_LEVE_FLEET_ROWS.length

/** Quantidade de placas distintas na base Veículos leves embebida (VEICULOS LEVES.txt deduplicado). */
export const VEICULOS_LEVES_CATALOG_UNIQUE_COUNT = VEICULOS_LEVES_FLEET_ROWS.length

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
    rawSource === 'sky' ||
    rawSource === 'munck' ||
    rawSource === 'moto' ||
    rawSource === 'picape4x4' ||
    rawSource === 'picapeleve' ||
    rawSource === 'veiculosleves'
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
  return `${v.placa} · ${v.modelo}`
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

  if (placaExistsInSkyCatalog(pl)) {
    return { ok: false, message: 'Esta placa já consta na base SKY.' }
  }
  if (placaExistsInMunckCatalog(pl)) {
    return { ok: false, message: 'Esta placa já consta na base Munck.' }
  }
  if (placaExistsInMotoCatalog(pl)) {
    return { ok: false, message: 'Esta placa já consta na base Moto.' }
  }
  if (placaExistsInPicape4x4Catalog(pl)) {
    return { ok: false, message: 'Esta placa já consta na base Picape 4x4.' }
  }
  if (placaExistsInPicapeLeveCatalog(pl)) {
    return { ok: false, message: 'Esta placa já consta na base Picape leve.' }
  }
  if (placaExistsInVeiculosLevesCatalog(pl)) {
    return { ok: false, message: 'Esta placa já consta na base Veículos leves.' }
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
  return (
    id.startsWith('sky-') ||
    id.startsWith('munck-') ||
    id.startsWith('moto-') ||
    id.startsWith('picape4x4-') ||
    id.startsWith('picapeleve-') ||
    id.startsWith('veiculosleves-')
  )
}

export function removeFleetVehicle(id: string): void {
  if (isEmbeddedCatalogFleetVehicleId(id)) return
  writeFleetVehicles(readFleetVehicles().filter((v) => v.id !== id))
}
