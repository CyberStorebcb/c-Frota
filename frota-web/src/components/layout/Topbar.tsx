import { Search, Bell, Menu, PanelLeft, Moon, Sun } from 'lucide-react'
import { useTheme } from '../../theme/ThemeProvider'

export function Topbar({
  onMenuClick,
  onToggleSidebar,
}: {
  onMenuClick: () => void
  onToggleSidebar: () => void
}) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="h-14 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex h-full items-center gap-3 px-4 md:px-6">
        <button
          onClick={onMenuClick}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 md:hidden"
          aria-label="Abrir menu"
        >
          <Menu size={18} />
        </button>

        <button
          onClick={onToggleSidebar}
          className="hidden md:inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
          aria-label="Colapsar sidebar"
        >
          <PanelLeft size={18} />
        </button>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 w-full max-w-xl dark:border-slate-800 dark:bg-slate-900/40">
          <Search size={16} className="text-slate-400 dark:text-slate-500" />
          <input
            placeholder="Buscar..."
            className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>
        <button
          onClick={toggleTheme}
          className="ml-auto inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
          aria-label="Alternar tema"
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900">
          <Bell size={18} />
        </button>
      </div>
    </header>
  )
}

