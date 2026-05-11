import { NavLink, useNavigate } from 'react-router-dom'
import { Car, ClipboardList, LayoutDashboard, LogOut, Settings2, Shield, Truck, X } from 'lucide-react'
import { labelForArea } from '../../access/accessAreas'
import { useAuth } from '../../auth/AuthContext'

const baseNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/gerenciar', label: 'Gerenciar', icon: Settings2 },
  { to: '/registro', label: 'Registro', icon: Car },
  { to: '/gerenciar/checklists', label: 'Checklists', icon: ClipboardList },
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
          <Footer collapsed={false} onAfterLogout={onClose} />
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
  const { user } = useAuth()
  const navItems = [
    ...baseNav,
    ...(user?.role === 'admin' ? ([{ to: '/administrador', label: 'Administrador', icon: Shield }] as const) : []),
  ]

  return (
    <nav className="px-3 py-3">
      {!collapsed ? (
        <div className="px-2 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Navegação
        </div>
      ) : null}
      <ul className="space-y-1">
        {navItems.map((item) => (
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

function Footer({ collapsed, onAfterLogout }: { collapsed: boolean; onAfterLogout?: () => void }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div
      className={[
        'mt-auto border-t border-slate-200 py-4 dark:border-slate-800',
        collapsed ? 'px-3' : 'px-5',
      ].join(' ')}
    >
      {!collapsed && user ? (
        <div className="mb-3 space-y-1">
          <div
            className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400"
            title={
              user.role === 'user' && user.userKind === 'special'
                ? `${user.email} · ${labelForArea(user.area)}`
                : user.email
            }
          >
            {user.email}
          </div>
          {user.role === 'user' && user.userKind === 'special' ? (
            <div className="text-[11px] font-extrabold uppercase tracking-wide text-brand-600 dark:text-brand-400">
              Especial · {labelForArea(user.area)}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className={['flex items-center gap-2', collapsed ? 'flex-col' : 'flex-row'].join(' ')}>
        <button
          type="button"
          onClick={() => {
            logout()
            onAfterLogout?.()
            navigate('/login', { replace: true })
          }}
          className={[
            'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900',
            collapsed ? 'w-full' : 'flex-1',
          ].join(' ')}
          title="Sair"
        >
          <LogOut size={16} />
          {!collapsed ? <span>Sair</span> : null}
        </button>
        <div
          className={[
            'text-xs font-semibold text-slate-400 dark:text-slate-500',
            collapsed ? 'text-center' : 'whitespace-nowrap',
            onAfterLogout && !collapsed ? 'ml-auto' : '',
          ].join(' ')}
        >
          v1.0.0
        </div>
      </div>
    </div>
  )
}

