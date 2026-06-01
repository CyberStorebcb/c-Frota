import { useCallback, useEffect, useState } from 'react'
import { Check, Settings2, X } from 'lucide-react'
import {
  ALL_PERMISSIONS,
  PERMISSION_META,
  type UserPermission,
} from '../../auth/permissions'
import { fetchUserPermissions, saveUserPermissions } from '../../services/userPermissionsService'

type Props = {
  user: { id: string; email: string; role: 'admin' | 'user' }
  onClose: () => void
  onSaved: (message: string) => void
  onError: (message: string) => void
}

export function UserPermissionsModal({ user, onClose, onSaved, onError }: Props) {
  const [selected, setSelected] = useState<Set<UserPermission>>(new Set())
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const perms = await fetchUserPermissions(user.id)
      setSelected(new Set(perms))
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao carregar permissões.')
      onClose()
    } finally {
      setCarregando(false)
    }
  }, [user.id, onClose, onError])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const toggle = (perm: UserPermission) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(perm)) next.delete(perm)
      else next.add(perm)
      return next
    })
  }

  const salvar = async () => {
    setSalvando(true)
    try {
      await saveUserPermissions(user.id, ALL_PERMISSIONS.filter((p) => selected.has(p)))
      onSaved(`Permissões de ${user.email} atualizadas.`)
      onClose()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao guardar permissões.')
    } finally {
      setSalvando(false)
    }
  }

  const isAdmin = user.role === 'admin'

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        role="dialog"
        aria-labelledby="permissoes-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 size={16} className="text-blue-600 dark:text-blue-400" aria-hidden />
            <span id="permissoes-titulo" className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              Gerenciar permissões
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mb-4 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{user.email}</p>

        {isAdmin ? (
          <p className="rounded-xl border border-brand-200/80 bg-brand-50/80 px-3 py-3 text-xs font-semibold leading-relaxed text-brand-900 dark:border-brand-900/40 dark:bg-brand-950/30 dark:text-brand-200">
            Administradores têm acesso total automaticamente. As permissões abaixo aplicam-se apenas a utilizadores com perfil &quot;Usuário&quot;.
          </p>
        ) : carregando ? (
          <p className="py-8 text-center text-sm font-semibold text-slate-400">A carregar permissões…</p>
        ) : (
          <ul className="space-y-2">
            {PERMISSION_META.map(({ key, label, description }) => {
              const active = selected.has(key)
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                      active
                        ? 'border-blue-300 bg-blue-50/80 dark:border-blue-800 dark:bg-blue-950/30'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-slate-600'
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                        active
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                      }`}
                      aria-hidden
                    >
                      {active ? <Check size={12} strokeWidth={3} /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-extrabold text-slate-900 dark:text-slate-100">{label}</span>
                      <span className="mt-0.5 block text-[11px] font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
                        {description}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm font-extrabold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            Cancelar
          </button>
          {!isAdmin ? (
            <button
              type="button"
              onClick={() => void salvar()}
              disabled={salvando || carregando}
              className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-extrabold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {salvando ? 'A guardar…' : 'Guardar'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
