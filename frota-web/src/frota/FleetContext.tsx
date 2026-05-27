import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAllSupabasePages } from '../lib/supabasePaginate'
import {
  getDisplayedFleetVehicles,
  normalizePlaca,
  type FleetVehicle,
  type VehicleStatus,
  VEHICLE_TYPE_IDS,
  type VehicleTipo,
} from './vehicleRegistry'

// ── Supabase row → FleetVehicle ───────────────────────────────────────────

type SupabaseRow = {
  id: string
  placa: string
  modelo: string
  tipo: string
  prefixo: string
  responsavel: string
  supervisor: string
  coordenador: string
  base: string
  ano: string
  status: string
  created_at: string
  deleted_at: string | null
  proprietario: string
  setor: string
  processo: string
}

function rowToVehicle(r: SupabaseRow): FleetVehicle {
  const tipo = VEHICLE_TYPE_IDS.includes(r.tipo as VehicleTipo)
    ? (r.tipo as VehicleTipo)
    : 'VEICULOS LEVES'
  return {
    id: r.id,
    placa: normalizePlaca(r.placa),
    modelo: r.modelo || '—',
    tipo,
    prefixo: r.prefixo || 'N/A',
    responsavel: r.responsavel || 'NÃO ATRIBUÍDO',
    supervisor: r.supervisor || 'NÃO ATRIBUÍDO',
    coordenador: r.coordenador || 'NÃO ATRIBUÍDO',
    base: r.base || 'N/A',
    status: (r.status === 'INATIVO' ? 'INATIVO' : 'ATIVO') as VehicleStatus,
    emManutencao: false,
    ano: r.ano || '',
    proprietario: r.proprietario || '',
    setor: r.setor || '',
    processo: r.processo || '',
    createdAt: r.created_at,
    source: 'local' as const,
  }
}

// ── contexto ──────────────────────────────────────────────────────────────

type FleetContextValue = {
  /** Frota completa: Supabase tem precedência, catálogo embebido preenche o restante. */
  vehicles: FleetVehicle[]
  loading: boolean
  /** Força re-fetch do Supabase. */
  reload: () => void
}

const FleetContext = createContext<FleetContextValue>({
  vehicles: [],
  loading: true,
  reload: () => undefined,
})

export function FleetProvider({ children }: { children: ReactNode }) {
  const [supabaseVehicles, setSupabaseVehicles] = useState<FleetVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setLoading(true)
    void fetchAllSupabasePages((from, to) =>
      supabase
        .from('vehicles')
        .select('*')
        .is('deleted_at', null)
        .order('placa', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    )
      .then(({ data, error }) => {
        if (error) {
          setSupabaseVehicles([])
          setLoading(false)
          return
        }
        setSupabaseVehicles(data.map((r) => rowToVehicle(r as SupabaseRow)))
        setLoading(false)
      })
  }, [tick])

  useEffect(() => {
    const onChange = () => setTick((t) => t + 1)
    window.addEventListener('frota-catalog-trash-changed', onChange)
    return () => window.removeEventListener('frota-catalog-trash-changed', onChange)
  }, [])

  const reload = () => setTick((t) => t + 1)

  // Supabase prevalece; catálogo embebido preenche placas ausentes no Supabase
  const vehicles = useMemo(() => {
    const supaPlacas = new Set(supabaseVehicles.map((v) => v.placa))
    const embedded = getDisplayedFleetVehicles().filter((v) => !supaPlacas.has(v.placa))
    return [...supabaseVehicles, ...embedded].sort((a, b) => a.placa.localeCompare(b.placa))
  }, [supabaseVehicles])

  return (
    <FleetContext.Provider value={{ vehicles, loading, reload }}>
      {children}
    </FleetContext.Provider>
  )
}

export function useFleet(): FleetContextValue {
  return useContext(FleetContext)
}
