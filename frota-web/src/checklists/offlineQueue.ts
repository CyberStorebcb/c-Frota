import type { ChecklistInsert } from '../lib/supabase'

const DB_NAME = 'frota-checklists-offline'
const DB_VERSION = 1
const STORE_NAME = 'pending-checklists'

/** Número máximo de tentativas antes de abandonar o checklist. */
export const MAX_RETRY_ATTEMPTS = 5

/** Checklists sincronizados há mais de X dias são removidos automaticamente. */
const SYNCED_CLEANUP_DAYS = 30

export type OfflineChecklistFile = {
  name: string
  type: string
  itemId: string | null
  file: Blob
}

export type OfflineChecklistStatus = 'pending' | 'syncing' | 'synced' | 'error'

export type OfflineChecklistRecord = {
  localId: string
  createdAt: string
  updatedAt: string
  status: OfflineChecklistStatus
  attempts: number
  lastError: string | null
  payload: ChecklistInsert
  files: OfflineChecklistFile[]
}

export type SyncSummary = {
  pending: number
  syncing: number
  error: number
}

type Listener = () => void

const listeners = new Set<Listener>()

function notify() {
  for (const listener of listeners) listener()
}

export function subscribeOfflineQueue(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'localId' })
        store.createIndex('status', 'status')
        store.createIndex('createdAt', 'createdAt')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      dbPromise = null  // permite retry na próxima chamada
      reject(request.error)
    }
  })
  return dbPromise
}

export async function enqueueChecklist(payload: ChecklistInsert, files: OfflineChecklistFile[]) {
  const now = new Date().toISOString()
  const record: OfflineChecklistRecord = {
    localId: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: 'pending',
    attempts: 0,
    lastError: null,
    payload,
    files,
  }

  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).put(record)
  await txDone(tx)

  // Registra background sync no SW para sincronizar mesmo com app fechado
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((reg) => {
      if ('sync' in reg) {
        return (reg.sync as { register: (tag: string) => Promise<void> }).register('frota-sync-checklists')
      }
    }).catch(() => {})
  }
  notify()
  return record
}

export async function listOfflineChecklists(): Promise<OfflineChecklistRecord[]> {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const records = await requestToPromise<OfflineChecklistRecord[]>(tx.objectStore(STORE_NAME).getAll())
  await txDone(tx)
  return records.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/** Estado de sincronização de um checklist específico, identificado pelo localId. */
export type ChecklistSyncState = 'syncing' | 'confirmed' | 'failed'

/**
 * Consulta o estado real de envio de um checklist:
 *   • 'confirmed' — não está mais na fila (foi inserido no servidor e removido)
 *   • 'failed'    — esgotou as tentativas e continua com erro
 *   • 'syncing'   — ainda pendente / tentando enviar
 */
export async function getChecklistSyncState(localId: string): Promise<ChecklistSyncState> {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const rec = await requestToPromise<OfflineChecklistRecord | undefined>(
    tx.objectStore(STORE_NAME).get(localId),
  )
  await txDone(tx)
  if (!rec) return 'confirmed'
  if (rec.status === 'synced') return 'confirmed'
  if (rec.status === 'error' && rec.attempts >= MAX_RETRY_ATTEMPTS) return 'failed'
  return 'syncing'
}

export async function listPendingOfflineChecklists(): Promise<OfflineChecklistRecord[]> {
  const records = await listOfflineChecklists()
  // Registros presos em 'syncing' por mais de 5 minutos são tratados como 'error'
  const SYNCING_TIMEOUT_MS = 5 * 60 * 1000
  const now = Date.now()
  return records.filter((r) => {
    if (r.status === 'syncing') {
      return now - new Date(r.updatedAt).getTime() > SYNCING_TIMEOUT_MS && r.attempts < MAX_RETRY_ATTEMPTS
    }
    return (r.status === 'pending' || r.status === 'error') && r.attempts < MAX_RETRY_ATTEMPTS
  })
}

export async function updateOfflineChecklist(record: OfflineChecklistRecord) {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).put({ ...record, updatedAt: new Date().toISOString() })
  await txDone(tx)
  notify()
}

/**
 * Reseta um checklist para nova tentativa de envio (zera attempts e erro),
 * mesmo que já tenha esgotado o limite. Use junto com syncOfflineChecklists().
 */
export async function retryChecklist(localId: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const rec = await requestToPromise<OfflineChecklistRecord | undefined>(store.get(localId))
  if (rec) {
    store.put({ ...rec, status: 'pending', attempts: 0, lastError: null, updatedAt: new Date().toISOString() })
  }
  await txDone(tx)
  notify()
}

/** Reseta TODOS os checklists pendentes/com erro para nova tentativa. */
export async function retryAllStuck(): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const records = await requestToPromise<OfflineChecklistRecord[]>(store.getAll())
  const now = new Date().toISOString()
  for (const rec of records) {
    if (rec.status === 'pending' || rec.status === 'error' || rec.status === 'syncing') {
      store.put({ ...rec, status: 'pending', attempts: 0, lastError: null, updatedAt: now })
    }
  }
  await txDone(tx)
  notify()
}

/** Itens presos na fila (pendentes ou com erro) com dados para exibição. */
export type StuckChecklistInfo = {
  localId: string
  placa: string
  operador: string
  dataInspecao: string
  status: OfflineChecklistStatus
  attempts: number
  lastError: string | null
  createdAt: string
}

export async function listStuckChecklists(): Promise<StuckChecklistInfo[]> {
  const records = await listOfflineChecklists()
  return records
    .filter((r) => r.status !== 'synced')
    .map((r) => {
      const dv = (r.payload.dados_veiculo ?? {}) as Record<string, unknown>
      return {
        localId: r.localId,
        placa: String(dv.placa ?? '—'),
        operador: r.payload.nome_operador ?? '—',
        dataInspecao: r.payload.data_inspecao ?? '—',
        status: r.status,
        attempts: r.attempts,
        lastError: r.lastError,
        createdAt: r.createdAt,
      }
    })
}

export async function removeOfflineChecklist(localId: string) {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).delete(localId)
  await txDone(tx)
  notify()
}

export async function getOfflineQueueSummary(): Promise<SyncSummary> {
  const records = await listOfflineChecklists()
  return records.reduce<SyncSummary>(
    (acc, record) => {
      if (record.status === 'pending') acc.pending++
      if (record.status === 'syncing') acc.syncing++
      if (record.status === 'error' && record.attempts < MAX_RETRY_ATTEMPTS) acc.error++
      return acc
    },
    { pending: 0, syncing: 0, error: 0 },
  )
}

/**
 * Remove apenas registros JÁ SINCRONIZADOS com mais de SYNCED_CLEANUP_DAYS dias.
 *
 * IMPORTANTE: registros com erro NÃO são apagados, mesmo após esgotar as
 * tentativas automáticas. Eles permanecem na fila para reenvio manual (painel
 * de pendências / botão "Reenviar agora") — evita perda de dados e garante que
 * getChecklistSyncState() distinga "confirmado" (removido) de "falhou" (mantido).
 * Chamado automaticamente pelo syncOfflineChecklists após cada sync.
 */
export async function cleanupOfflineQueue(): Promise<void> {
  const records = await listOfflineChecklists()
  const cutoff = Date.now() - SYNCED_CLEANUP_DAYS * 86_400_000
  const toRemove = records.filter(
    (r) => r.status === 'synced' && new Date(r.updatedAt).getTime() < cutoff,
  )
  await Promise.all(toRemove.map((r) => removeOfflineChecklist(r.localId)))
}
