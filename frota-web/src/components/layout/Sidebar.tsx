import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Settings2, Truck, X } from 'lucide-react'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/gerenciar', label: 'Gerenciar', icon: Settings2 },
] as const

export function Sidebar({
  open,
  collapsed,
  onClose,
}: {
  open: boolean
  collapsed: boolean
  onClose: () => void
}) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={[
          'hidden h-full shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col dark:border-slate-800 dark:bg-slate-950',
          'transition-[width] duration-200 ease-out',
          collapsed ? 'w-20' : 'w-72',
        ].join(' ')}
      >
        <Header collapsed={collapsed} />
        <Nav collapsed={collapsed} onNavigate={() => {}} />
        <Footer collapsed={collapsed} />
      </aside>

      {/* Mobile drawer */}
      <div className={open ? 'md:hidden' : 'hidden'}>
        <button
          className="fixed inset-0 z-40 bg-black/30"
          onClick={onClose}
          aria-label="Fechar menu"
        />
        <aside className="fixed left-0 top-0 z-50 h-full w-80 max-w-[85vw] border-r border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-950">
          <div className="flex h-14 items-center justify-between px-5">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-soft">
                <Truck size={18} />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-extrabold tracking-tight">Frota</div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Web Dashboard</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
          <Nav collapsed={false} onNavigate={onClose} />
          <Footer collapsed={false} />
        </aside>
      </div>
    </>
  )
}

function Header({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={['flex h-14 items-center gap-2', collapsed ? 'px-3' : 'px-5'].join(' ')}>
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-soft">
        <Truck size={18} />
      </div>
      {!collapsed ? (
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-extrabold tracking-tight">Frota</div>
          <div className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">Web Dashboard</div>
        </div>
      ) : null}
    </div>
  )
}

function Nav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate: () => void }) {
  return (
    <nav className="px-3 py-3">
      {!collapsed ? (
        <div className="px-2 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Navegação
        </div>
      ) : null}
      <ul className="space-y-1">
        {nav.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                [
                  'group relative flex items-center rounded-xl px-3 py-2 text-sm font-extrabold',
                  collapsed ? 'justify-center' : 'gap-3',
                  'transition-colors',
                  isActive
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900/60 dark:hover:text-slate-100',
                ].join(' ')
              }
            >
              <span
                className={[
                  'grid h-9 w-9 place-items-center rounded-xl border border-transparent',
                  'bg-slate-50 text-slate-700 group-hover:bg-white dark:bg-slate-900/40 dark:text-slate-200 dark:group-hover:bg-slate-900',
                ].join(' ')}
              >
                <item.icon size={18} className="opacity-90" />
              </span>

              {!collapsed ? <span className="truncate">{item.label}</span> : null}

              <span className="pointer-events-none absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand-600 opacity-0 group-[&[aria-current=page]]:opacity-100" />
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function Footer({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={[
        'mt-auto border-t border-slate-200 py-4 text-xs font-semibold text-slate-400 dark:border-slate-800 dark:text-slate-500',
        collapsed ? 'px-3 text-center' : 'px-5',
      ].join(' ')}
    >
      v1.0.0
    </div>
  )
}

