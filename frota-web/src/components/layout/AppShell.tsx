import { useCallback, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

const SIDEBAR_COLLAPSED_KEY = 'frota.sidebar.collapsed'

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
  } catch {
    return false
  }
}

export function AppShellLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed)

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), [])
  const toggleCollapsed = useCallback(() => setSidebarCollapsed((v) => {
    const next = !v
    try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next)) } catch { /* ignore */ }
    return next
  }), [])
  const collapseSidebar = useCallback(() => {
    setSidebarCollapsed(true)
    try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'true') } catch { /* ignore */ }
  }, [])

  return (
    <div className="h-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex h-full w-full">
        <Sidebar
          open={sidebarOpen}
          collapsed={sidebarCollapsed}
          onClose={closeSidebar}
        />
        <div className="min-w-0 flex-1">
          <Topbar onMenuClick={toggleSidebar} onToggleSidebar={toggleCollapsed} />
          <main
            className="flex h-[calc(100%-56px)] min-h-0 flex-col overflow-auto bg-transparent px-3 py-3 sm:px-4 sm:py-4 lg:px-8 lg:py-6"
            onClick={() => {
              if (sidebarOpen) closeSidebar()
              if (!sidebarCollapsed) collapseSidebar()
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

export function AppShell() {
  return (
    <AppShellLayout>
      <Outlet />
    </AppShellLayout>
  )
}

