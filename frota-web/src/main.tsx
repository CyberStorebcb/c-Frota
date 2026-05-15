import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthContext'
import { OfflineSyncProvider } from './checklists/OfflineSyncProvider'
import { ThemeProvider } from './theme/ThemeProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ApontamentosProvider } from './apontamentos/ApontamentosContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <OfflineSyncProvider>
              <ApontamentosProvider>
                <ErrorBoundary>
                  <App />
                </ErrorBoundary>
              </ApontamentosProvider>
            </OfflineSyncProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[pwa] Falha ao registrar service worker', error)
    })
  })

  // Quando o SW ativa uma nova versão, exibe banner para o usuário atualizar
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type !== 'SW_UPDATED') return

    // Cria banner de atualização flutuante
    const existing = document.getElementById('pwa-update-banner')
    if (existing) return

    const banner = document.createElement('div')
    banner.id = 'pwa-update-banner'
    banner.style.cssText = [
      'position:fixed', 'bottom:80px', 'left:50%', 'transform:translateX(-50%)',
      'z-index:9999', 'display:flex', 'align-items:center', 'gap:12px',
      'background:#0b1020', 'color:#fff', 'border:1px solid rgba(255,255,255,0.15)',
      'border-radius:16px', 'padding:12px 16px', 'box-shadow:0 8px 32px rgba(0,0,0,0.4)',
      'font-family:sans-serif', 'font-size:13px', 'font-weight:700',
      'white-space:nowrap', 'max-width:calc(100vw - 32px)',
    ].join(';')

    const text = document.createElement('span')
    text.textContent = 'Nova versão disponível!'
    banner.appendChild(text)

    const btn = document.createElement('button')
    btn.textContent = 'Atualizar'
    btn.style.cssText = [
      'background:#be123c', 'color:#fff', 'border:none', 'border-radius:10px',
      'padding:6px 14px', 'font-size:13px', 'font-weight:800', 'cursor:pointer',
    ].join(';')
    btn.onclick = () => window.location.reload()
    banner.appendChild(btn)

    document.body.appendChild(banner)
  })
}
