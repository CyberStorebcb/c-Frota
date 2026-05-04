import { useMemo, useState } from 'react'
import { ArrowLeftRight, KeyRound, Shield, Sparkles, UserPlus, X } from 'lucide-react'
import { convertAllowlistUserToSpecial, convertSpecialUserToNormal } from '../access/adminUserTransitions'
import { readAllowlist, addToAllowlist, removeFromAllowlist, updateAllowedUserPassword } from '../access/allowlist'
import { readSpecialUsers, registerSpecialUser, removeSpecialUser, updateSpecialUserPassword } from '../access/specialUsers'
import { useAuth } from '../auth/AuthContext'

const DEFAULT_SPECIAL_AREA = 'TODAS' as const

export function AdministradorPage() {
  const { user } = useAuth()
  const [msg, setMsg] = useState<string | null>(null)

  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [userKind, setUserKind] = useState<'normal' | 'special'>('normal')

  const [list, setList] = useState(() => readAllowlist())
  const [specialList, setSpecialList] = useState(() => readSpecialUsers())
  const [passwordEdit, setPasswordEdit] = useState<{ kind: 'normal' | 'special'; email: string } | null>(null)
  const [editPassword, setEditPassword] = useState('')

  const adminEmail = useMemo(() => import.meta.env.VITE_ADMIN_EMAIL?.trim().toLowerCase() ?? '', [])

  const refreshNormal = () => setList(readAllowlist())
  const refreshSpecial = () => setSpecialList(readSpecialUsers())

  function onAddUser(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    const eNorm = emailInput.trim().toLowerCase()

    if (passwordInput !== confirmPassword) {
      setMsg('As senhas não coincidem.')
      return
    }

    if (userKind === 'normal') {
      if (readSpecialUsers().some((s) => s.email === eNorm)) {
        setMsg('Este e-mail já existe como utilizador especial. Remova-o da lista de especiais antes de o adicionar como padrão.')
        return
      }
      const res = addToAllowlist(emailInput, passwordInput)
      if (!res.ok) {
        setMsg(res.message)
        return
      }
    } else {
      if (readAllowlist().some((u) => u.email === eNorm)) {
        setMsg('Este e-mail já está na lista de utilizadores padrão. Remova-o dali antes de o registar como especial.')
        return
      }
      const res = registerSpecialUser(emailInput, passwordInput, DEFAULT_SPECIAL_AREA)
      if (!res.ok) {
        setMsg(res.message)
        return
      }
    }

    setEmailInput('')
    setPasswordInput('')
    setConfirmPassword('')
    refreshNormal()
    refreshSpecial()
    setMsg(
      userKind === 'normal'
        ? 'Utilizador padrão adicionado à lista com a senha definida.'
        : 'Utilizador especial criado. Inicia sessão com este e-mail e senha (perfil especial na barra lateral).',
    )
  }

  function onSavePassword(ev: React.FormEvent) {
    ev.preventDefault()
    if (!passwordEdit) return
    setMsg(null)
    const res =
      passwordEdit.kind === 'normal'
        ? updateAllowedUserPassword(passwordEdit.email, editPassword)
        : updateSpecialUserPassword(passwordEdit.email, editPassword)
    if (!res.ok) {
      setMsg(res.message)
      return
    }
    setPasswordEdit(null)
    setEditPassword('')
    refreshNormal()
    refreshSpecial()
    setMsg('Senha atualizada.')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-8 sm:px-6">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white shadow-soft">
          <Shield size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Administrador</h1>
          <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-400">
            Atribua e-mail e senha e indique se o acesso é <strong className="text-slate-800 dark:text-slate-200">padrão</strong> (lista
            restrita) ou <strong className="text-slate-800 dark:text-slate-200">especial</strong> (perfil com permissões próprias na
            aplicação). Os dados ficam no navegador até existir backend.
          </p>
        </div>
      </div>

      {user ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
          Sessão: <span className="font-mono text-slate-900 dark:text-white">{user.email}</span> · papel{' '}
          <span className="text-brand-600 dark:text-brand-400">administrador</span>
        </p>
      ) : null}

      {adminEmail ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Conta de administrador (ambiente): <span className="font-mono">{adminEmail}</span>
        </p>
      ) : null}

      {msg ? (
        <div
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200"
          role="status"
        >
          {msg}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <h2 className="mb-4 text-lg font-black tracking-tight text-slate-900 dark:text-white">Atribuir utilizador</h2>

        <form onSubmit={onAddUser} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <label htmlFor="adm-email" className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                E-mail
              </label>
              <input
                id="adm-email"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="utilizador@empresa.com.br"
                autoComplete="off"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div className="sm:col-span-1">
              <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Tipo de utilizador</span>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-500/10 dark:border-slate-700 dark:has-[:checked]:border-brand-400">
                  <input
                    type="radio"
                    name="user-kind"
                    checked={userKind === 'normal'}
                    onChange={() => setUserKind('normal')}
                    className="size-4 accent-brand-600"
                  />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Utilizador padrão</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 has-[:checked]:border-sky-500 has-[:checked]:bg-sky-500/10 dark:border-slate-700 dark:has-[:checked]:border-sky-400">
                  <input
                    type="radio"
                    name="user-kind"
                    checked={userKind === 'special'}
                    onChange={() => setUserKind('special')}
                    className="size-4 accent-sky-600"
                  />
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                    <Sparkles size={16} className="text-sky-600 dark:text-sky-400" />
                    Utilizador especial
                  </span>
                </label>
              </div>
            </div>
            <div className="sm:col-span-1">
              <label htmlFor="adm-pw" className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Senha
              </label>
              <input
                id="adm-pw"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div className="sm:col-span-1">
              <label htmlFor="adm-pw2" className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Confirmar senha
              </label>
              <input
                id="adm-pw2"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-extrabold text-white shadow-soft hover:bg-brand-700 sm:w-auto"
          >
            <UserPlus size={18} />
            Adicionar utilizador
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-400">Utilizadores especiais ({specialList.length})</h2>
        {specialList.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Nenhum utilizador especial nesta lista (o registo em /registro-especial também pode criar especiais).
          </p>
        ) : (
          <ul className="mb-8 space-y-2">
            {specialList.map((row) => (
              <li
                key={row.email}
                className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">{row.email}</div>
                    <div className="text-xs font-bold text-sky-600 dark:text-sky-400">Utilizador especial</div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordEdit((v) =>
                          v?.email === row.email && v.kind === 'special' ? null : { kind: 'special', email: row.email },
                        )
                        setEditPassword('')
                        setMsg(null)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                      <KeyRound size={14} />
                      {passwordEdit?.email === row.email && passwordEdit.kind === 'special' ? 'Cancelar' : 'Alterar senha'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMsg(null)
                        const res = convertSpecialUserToNormal(row.email)
                        if (!res.ok) {
                          setMsg(res.message)
                          return
                        }
                        if (passwordEdit?.email === row.email && passwordEdit.kind === 'special') {
                          setPasswordEdit(null)
                          setEditPassword('')
                        }
                        refreshNormal()
                        refreshSpecial()
                        setMsg('Utilizador passou a padrão (mantém a mesma senha).')
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 px-3 py-2 text-xs font-extrabold text-sky-700 hover:bg-sky-50 dark:border-sky-600/50 dark:text-sky-300 dark:hover:bg-sky-950/40"
                      title="Mantém o e-mail e a senha na lista de utilizadores padrão"
                    >
                      <ArrowLeftRight size={14} />
                      Tornar padrão
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        removeSpecialUser(row.email)
                        if (passwordEdit?.email === row.email && passwordEdit.kind === 'special') {
                          setPasswordEdit(null)
                          setEditPassword('')
                        }
                        refreshSpecial()
                        setMsg(null)
                      }}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-extrabold text-rose-700 hover:bg-rose-50 dark:border-slate-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    >
                      <X size={16} />
                      Remover
                    </button>
                  </div>
                </div>
                {passwordEdit?.email === row.email && passwordEdit.kind === 'special' ? (
                  <form
                    onSubmit={onSavePassword}
                    className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-800 sm:flex-row sm:items-end"
                  >
                    <div className="min-w-0 flex-1">
                      <label htmlFor={`sp-pwd-${row.email}`} className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Nova senha
                      </label>
                      <input
                        id={`sp-pwd-${row.email}`}
                        type="password"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="Mínimo 4 caracteres"
                        autoComplete="new-password"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-brand-700">
                      Guardar
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <h2 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-400">Utilizadores padrão ({list.length})</h2>
        {list.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Lista vazia — qualquer login válido (e-mail + senha com 4+ caracteres) continua permitido, exceto a regra de administrador.
          </p>
        ) : (
          <ul className="space-y-3">
            {list.map((row) => (
              <li
                key={row.email}
                className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">{row.email}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {row.password ? (
                        <span className="text-emerald-600 dark:text-emerald-400">Senha definida</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">Legado: qualquer senha com 4+ caracteres</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordEdit((v) =>
                          v?.email === row.email && v.kind === 'normal' ? null : { kind: 'normal', email: row.email },
                        )
                        setEditPassword('')
                        setMsg(null)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                      <KeyRound size={14} />
                      {passwordEdit?.email === row.email && passwordEdit.kind === 'normal' ? 'Cancelar' : 'Alterar senha'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMsg(null)
                        const res = convertAllowlistUserToSpecial(row.email, DEFAULT_SPECIAL_AREA)
                        if (!res.ok) {
                          setMsg(res.message)
                          return
                        }
                        if (passwordEdit?.email === row.email && passwordEdit.kind === 'normal') {
                          setPasswordEdit(null)
                          setEditPassword('')
                        }
                        refreshNormal()
                        refreshSpecial()
                        setMsg('Utilizador passou a especial (mantém a mesma senha).')
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 px-3 py-2 text-xs font-extrabold text-sky-700 hover:bg-sky-50 dark:border-sky-600/50 dark:text-sky-300 dark:hover:bg-sky-950/40"
                      title="Requer senha definida (não legado sem senha)"
                    >
                      <Sparkles size={14} />
                      Tornar especial
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        removeFromAllowlist(row.email)
                        if (passwordEdit?.email === row.email && passwordEdit.kind === 'normal') {
                          setPasswordEdit(null)
                          setEditPassword('')
                        }
                        refreshNormal()
                        setMsg(null)
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-extrabold text-rose-700 hover:bg-rose-50 dark:border-slate-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      aria-label={`Remover ${row.email}`}
                    >
                      <X size={16} />
                      Remover
                    </button>
                  </div>
                </div>
                {passwordEdit?.email === row.email && passwordEdit.kind === 'normal' ? (
                  <form
                    onSubmit={onSavePassword}
                    className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-800 sm:flex-row sm:items-end"
                  >
                    <div className="min-w-0 flex-1">
                      <label htmlFor={`pwd-${row.email}`} className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Nova senha
                      </label>
                      <input
                        id={`pwd-${row.email}`}
                        type="password"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="Mínimo 4 caracteres"
                        autoComplete="new-password"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-brand-700">
                      Guardar
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
