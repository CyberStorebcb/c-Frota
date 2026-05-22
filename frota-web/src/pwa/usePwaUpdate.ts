import { useEffect, useState } from 'react'

/**
 * Detecta quando o Service Worker ativou uma nova versão (mensagem SW_UPDATED).
 * applyUpdate() recarrega a página para aplicar a versão nova.
 */
export function usePwaUpdate() {
  const [updatePending, setUpdatePending] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'SW_UPDATED') {
        setUpdatePending(true)
      }
    }

    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [])

  const applyUpdate = () => window.location.reload()

  return { updatePending, applyUpdate }
}
