import { useEffect } from 'react'
import { syncOfflineChecklists } from './syncOfflineChecklists'

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const sync = () => {
      if (!navigator.onLine) return
      void syncOfflineChecklists()
    }

    sync()
    window.addEventListener('online', sync)
    return () => window.removeEventListener('online', sync)
  }, [])

  return <>{children}</>
}
