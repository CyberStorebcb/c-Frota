import { useCallback, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), [])
  const toggleCollapsed = useCallback(() => setSidebarCollapsed((v) => !v), [])
  const collapseSidebar = useCallback(() => setSidebarCollapsed(true), [])

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
            className="h-[calc(100%-56px)] overflow-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-8 lg:py-6"
            onClick={() => {
              if (sidebarOpen) closeSidebar()
              if (!sidebarCollapsed) collapseSidebar()
            }}
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

