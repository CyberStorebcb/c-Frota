import { supabase, type ChecklistInsert } from '../lib/supabase'
import {
  listPendingOfflineChecklists,
  removeOfflineChecklist,
  updateOfflineChecklist,
  type OfflineChecklistFile,
  type OfflineChecklistRecord,
} from './offlineQueue'

const BUCKET = 'checklist-evidencias'

function safeFileName(fileName: string) {
  return fileName.replace(/\s+/g, '_').replace(/[^\w.\-]/g, '_')
}

async function uploadOfflineFile(schemaId: string, ts: number, file: OfflineChecklistFile, index: number): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const itemPart = file.itemId ? `item-${file.itemId}` : 'evidencia'
  const path = `${schemaId}/${ts}-${itemPart}-${index}-${safeFileName(file.name || `arquivo.${ext}`)}`
  const uploadFile = new File([file.file], file.name || `arquivo.${ext}`, { type: file.type || file.file.type })
  const { error } = await supabase.storage.from(BUCKET).upload(path, uploadFile, { upsert: false })
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

async function sendRecord(record: OfflineChecklistRecord) {
  const ts = Date.now()
  const payload: ChecklistInsert = {
    ...record.payload,
    observacoes: { ...record.payload.observacoes },
    evidencia_urls: [...record.payload.evidencia_urls],
  }
  const itemPhotoUrls = new Map<string, string[]>()

  for (const [index, file] of record.files.entries()) {
    const url = await uploadOfflineFile(payload.tipo, ts, file, index)
    if (!url) continue
    payload.evidencia_urls.push(url)
    if (file.itemId) {
      const urls = itemPhotoUrls.get(file.itemId) ?? []
      urls.push(url)
      itemPhotoUrls.set(file.itemId, urls)
    }
  }

  for (const [itemId, urls] of itemPhotoUrls.entries()) {
    const current = payload.observacoes[itemId] ?? ''
    payload.observacoes[itemId] = current
      ? `${current}\n__fotos__:${urls.join('|')}`
      : `__fotos__:${urls.join('|')}`
  }

  const { error } = await supabase.from('checklists').insert(payload)
  if (error) throw error
}

let syncingPromise: Promise<void> | null = null

export function syncOfflineChecklists() {
  if (syncingPromise) return syncingPromise

  syncingPromise = (async () => {
    const records = await listPendingOfflineChecklists()
    for (const record of records) {
      const syncingRecord: OfflineChecklistRecord = {
        ...record,
        status: 'syncing',
        attempts: record.attempts + 1,
        lastError: null,
      }
      await updateOfflineChecklist(syncingRecord)
      try {
        await sendRecord(syncingRecord)
        await removeOfflineChecklist(syncingRecord.localId)
      } catch (error) {
        await updateOfflineChecklist({
          ...syncingRecord,
          status: 'error',
          lastError: error instanceof Error ? error.message : 'Erro desconhecido ao sincronizar',
        })
      }
    }
  })().finally(() => {
    syncingPromise = null
  })

  return syncingPromise
}
