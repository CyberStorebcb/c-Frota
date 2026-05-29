import { supabase, supabaseConfigured } from '../lib/supabase'
import { normalizePlaca } from '../frota/vehicleRegistry'

export const CHECKLIST_AUSENCIA_MOTIVOS = ['FEITO', 'RESERVA', 'NÃO RODOU', 'OFICINA', 'DESMOBILIZADO'] as const
export type ChecklistAusenciaMotivo = (typeof CHECKLIST_AUSENCIA_MOTIVOS)[number]

export type ChecklistAusenciaJustificativaEntry = {
  motivo: ChecklistAusenciaMotivo
  placaReserva?: string
}

export type ChecklistAusenciaJustificativa = {
  placa: string
  motivo: ChecklistAusenciaMotivo
  placaReserva?: string
  periodoInicio: string
  periodoFim: string
  setor: string
  updatedAt: string
}

const STORAGE_KEY = 'frota.checklist.ausenciaJustificativas'

function storageKey(setor: string, placa: string, inicio: string, fim: string): string {
  return `${setor}|${normalizePlaca(placa)}|${inicio}|${fim}`
}

function readLocalCache(): Record<string, ChecklistAusenciaJustificativa> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, ChecklistAusenciaJustificativa>) : {}
  } catch {
    return {}
  }
}

function writeLocalCache(map: Record<string, ChecklistAusenciaJustificativa>): void {
  if (Object.keys(map).length === 0) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

function isMissingJustificativasTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  // Só aceita erros de "tabela não existe" ou "schema cache desatualizado".
  // NÃO captura violações de constraint (23514), erros de permissão (42501)
  // ou qualquer outro erro real de banco — esses devem propagar para o caller.
  if (error.code === '42P01' || error.code === 'PGRST205' || error.code === 'PGRST204') return true
  const msg = (error.message ?? '').toLowerCase()
  return msg.includes('schema cache')
}

function validatePlacaReserva(
  placa: string,
  motivo: ChecklistAusenciaMotivo,
  placaReserva?: string,
): { ok: true; placaReserva?: string } | { ok: false; message: string } {
  if (motivo !== 'RESERVA') return { ok: true }

  const reserva = normalizePlaca(placaReserva ?? '')
  if (!reserva) {
    return { ok: false, message: 'Informe a placa do veículo reserva.' }
  }
  if (reserva.length < 7) {
    return { ok: false, message: 'Placa reserva inválida.' }
  }
  if (reserva === placa) {
    return { ok: false, message: 'A placa reserva deve ser diferente da placa original.' }
  }
  return { ok: true, placaReserva: reserva }
}

function rowToJustificativa(row: {
  placa: string
  motivo: string
  placa_reserva?: string | null
  periodo_inicio: string
  periodo_fim: string
  setor: string
  updated_at?: string
}): ChecklistAusenciaJustificativa | null {
  const motivo = row.motivo as ChecklistAusenciaMotivo
  if (!CHECKLIST_AUSENCIA_MOTIVOS.includes(motivo)) return null
  const placaReserva = row.placa_reserva ? normalizePlaca(row.placa_reserva) : undefined
  return {
    placa: normalizePlaca(row.placa),
    motivo,
    placaReserva: placaReserva || undefined,
    periodoInicio: String(row.periodo_inicio).slice(0, 10),
    periodoFim: String(row.periodo_fim).slice(0, 10),
    setor: row.setor,
    updatedAt: row.updated_at ?? new Date().toISOString(),
  }
}

export async function loadChecklistAusenciaJustificativas(params: {
  periodoInicio: string
  periodoFim: string
  setor: string
}): Promise<Map<string, ChecklistAusenciaJustificativaEntry>> {
  const { periodoInicio, periodoFim, setor } = params
  const map = new Map<string, ChecklistAusenciaJustificativaEntry>()
  const local = readLocalCache()

  for (const item of Object.values(local)) {
    if (
      item.setor === setor &&
      item.periodoInicio === periodoInicio &&
      item.periodoFim === periodoFim
    ) {
      map.set(normalizePlaca(item.placa), {
        motivo: item.motivo,
        placaReserva: item.placaReserva,
      })
    }
  }

  if (!supabaseConfigured) return map

  const { data, error } = await supabase
    .from('checklist_ausencia_justificativas')
    .select('placa, motivo, placa_reserva, periodo_inicio, periodo_fim, setor, updated_at')
    .eq('setor', setor)
    .eq('periodo_inicio', periodoInicio)
    .eq('periodo_fim', periodoFim)

  if (error) {
    if (isMissingJustificativasTableError(error)) return map
    return map
  }

  for (const row of data ?? []) {
    const parsed = rowToJustificativa(row as {
      placa: string
      motivo: string
      placa_reserva?: string | null
      periodo_inicio: string
      periodo_fim: string
      setor: string
      updated_at?: string
    })
    if (parsed) {
      map.set(parsed.placa, {
        motivo: parsed.motivo,
        placaReserva: parsed.placaReserva,
      })
    }
  }

  return map
}

export async function saveChecklistAusenciaJustificativa(params: {
  placa: string
  motivo: ChecklistAusenciaMotivo
  placaReserva?: string
  periodoInicio: string
  periodoFim: string
  setor: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const placa = normalizePlaca(params.placa)
  if (!placa) return { ok: false, message: 'Placa inválida.' }

  const reservaCheck = validatePlacaReserva(placa, params.motivo, params.placaReserva)
  if (!reservaCheck.ok) return reservaCheck

  const record: ChecklistAusenciaJustificativa = {
    placa,
    motivo: params.motivo,
    placaReserva: reservaCheck.placaReserva,
    periodoInicio: params.periodoInicio,
    periodoFim: params.periodoFim,
    setor: params.setor,
    updatedAt: new Date().toISOString(),
  }

  const local = readLocalCache()
  local[storageKey(params.setor, placa, params.periodoInicio, params.periodoFim)] = record
  writeLocalCache(local)

  if (!supabaseConfigured) return { ok: true }

  const { error } = await supabase.from('checklist_ausencia_justificativas').upsert(
    {
      placa,
      motivo: params.motivo,
      placa_reserva: reservaCheck.placaReserva ?? null,
      periodo_inicio: params.periodoInicio,
      periodo_fim: params.periodoFim,
      setor: params.setor,
      updated_at: record.updatedAt,
    },
    { onConflict: 'placa,periodo_inicio,periodo_fim,setor' },
  )

  if (error) {
    if (isMissingJustificativasTableError(error)) return { ok: true }
    return { ok: false, message: error.message }
  }

  return { ok: true }
}

export async function removeChecklistAusenciaJustificativa(params: {
  placa: string
  periodoInicio: string
  periodoFim: string
  setor: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const placa = normalizePlaca(params.placa)
  if (!placa) return { ok: false, message: 'Placa inválida.' }

  const local = readLocalCache()
  delete local[storageKey(params.setor, placa, params.periodoInicio, params.periodoFim)]
  writeLocalCache(local)

  if (!supabaseConfigured) return { ok: true }

  const { error } = await supabase
    .from('checklist_ausencia_justificativas')
    .delete()
    .eq('placa', placa)
    .eq('periodo_inicio', params.periodoInicio)
    .eq('periodo_fim', params.periodoFim)
    .eq('setor', params.setor)

  if (error) {
    if (isMissingJustificativasTableError(error)) return { ok: true }
    return { ok: false, message: error.message }
  }

  return { ok: true }
}
