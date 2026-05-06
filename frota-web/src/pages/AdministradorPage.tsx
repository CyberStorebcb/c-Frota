import { useMemo, useState } from 'react'
import { ArrowLeftRight, KeyRound, Search, Shield, Sparkles, UserPlus, Users, X } from 'lucide-react'
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

  const [activeTab, setActiveTab] = useState<'normal' | 'special'>('normal')
  const [search, setSearch] = useState('')

  const filteredNormal = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = list
    if (!q) return rows
    return rows.filter((r) => r.email.toLowerCase().includes(q))
  }, [list, search])

  const filteredSpecial = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = specialList
    if (!q) return rows
    return rows.filter((r) => r.email.toLowerCase().includes(q))
  }, [specialList, search])

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
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white shadow-soft">
              <Shield size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Administrador</h1>
              <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-400">
                Gerencie utilizadores e senhas (dados ficam no navegador até existir backend).
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-slate-500 dark:text-slate-400" />
                <span>Padrão</span>
              </div>
              <div className="mt-1 text-lg font-black tracking-tight text-slate-900 dark:text-white">{list.length}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-sky-600 dark:text-sky-400" />
                <span>Especial</span>
              </div>
              <div className="mt-1 text-lg font-black tracking-tight text-slate-900 dark:text-white">{specialList.length}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            {user ? (
              <div>
                Sessão: <span className="font-mono text-slate-900 dark:text-white">{user.email}</span> ·{' '}
                <span className="text-brand-600 dark:text-brand-400">administrador</span>
              </div>
            ) : null}
            {adminEmail ? (
              <div className="text-slate-500 dark:text-slate-400">
                Admin (ambiente): <span className="font-mono">{adminEmail}</span>
              </div>
            ) : null}
          </div>

          <div className="relative w-full sm:max-w-sm">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por e-mail…"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        {msg ? (
          <div
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200"
            role="status"
          >
            {msg}
          </div>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr,1.25fr] lg:items-start">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
          <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Atribuir utilizador</h2>
          <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-400">
            Defina e-mail e senha e escolha o tipo de utilizador.
          </p>

          <form onSubmit={onAddUser} className="mt-5 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
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
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Tipo de utilizador</span>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-500/10 dark:border-slate-700 dark:has-[:checked]:border-brand-400">
                    <span className="min-w-0">
                      <span className="block text-sm font-black text-slate-800 dark:text-slate-100">Utilizador padrão</span>
                      <span className="mt-0.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">Acesso via lista restrita</span>
                    </span>
                    <input
                      type="radio"
                      name="user-kind"
                      checked={userKind === 'normal'}
                      onChange={() => setUserKind('normal')}
                      className="size-4 shrink-0 accent-brand-600"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3 has-[:checked]:border-sky-500 has-[:checked]:bg-sky-500/10 dark:border-slate-700 dark:has-[:checked]:border-sky-400">
                    <span className="min-w-0">
                      <span className="inline-flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-100">
                        <Sparkles size={16} className="text-sky-600 dark:text-sky-400" />
                        Utilizador especial
                      </span>
                      <span className="mt-0.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">Perfil com permissões próprias</span>
                    </span>
                    <input
                      type="radio"
                      name="user-kind"
                      checked={userKind === 'special'}
                      onChange={() => setUserKind('special')}
                      className="size-4 shrink-0 accent-sky-600"
                    />
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
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
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
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 via-brand-600 to-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-soft outline-none transition-all hover:from-brand-700 hover:via-brand-700 hover:to-indigo-700 focus-visible:ring-2 focus-visible:ring-brand-500/40 active:translate-y-[1px] active:shadow-none sm:w-auto"
            >
              <span className="grid size-8 place-items-center rounded-xl bg-white/15 transition-colors group-hover:bg-white/20">
                <UserPlus size={18} />
              </span>
              Adicionar utilizador
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Utilizadores</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-400">Clique em “Alterar senha” para editar.</p>
            </div>

            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/60">
              <button
                type="button"
                onClick={() => setActiveTab('normal')}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-[0.18em] transition-colors ${
                  activeTab === 'normal'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Users size={14} />
                Padrão ({filteredNormal.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('special')}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-[0.18em] transition-colors ${
                  activeTab === 'special'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Sparkles size={14} />
                Especial ({filteredSpecial.length})
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {activeTab === 'special' ? (
              filteredSpecial.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  Nenhum utilizador especial nesta lista.
                </div>
              ) : (
                <ul className="space-y-2">
                  {filteredSpecial.map((row) => (
                    <li key={row.email} className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="truncate font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">{row.email}</div>
                          <div className="mt-1 text-xs font-black uppercase tracking-wider text-sky-700 dark:text-sky-300">
                            Utilizador especial
                          </div>
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
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
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
                            className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/40 px-3 py-2 text-xs font-extrabold text-sky-700 hover:bg-sky-50 dark:border-sky-600/50 dark:text-sky-300 dark:hover:bg-sky-950/40"
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
                            className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-extrabold text-rose-700 hover:bg-rose-50 dark:border-slate-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
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
                            <label
                              htmlFor={`sp-pwd-${row.email}`}
                              className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-400"
                            >
                              Nova senha
                            </label>
                            <input
                              id={`sp-pwd-${row.email}`}
                              type="password"
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                              placeholder="Mínimo 4 caracteres"
                              autoComplete="new-password"
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            />
                          </div>
                          <button
                            type="submit"
                            className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-brand-700"
                          >
                            Guardar
                          </button>
                        </form>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )
            ) : filteredNormal.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                Lista vazia — qualquer login válido (e-mail + senha com 4+ caracteres) continua permitido, exceto a regra de administrador.
              </div>
            ) : (
              <ul className="space-y-2">
                {filteredNormal.map((row) => (
                  <li key={row.email} className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
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
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
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
                          className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/40 px-3 py-2 text-xs font-extrabold text-sky-700 hover:bg-sky-50 dark:border-sky-600/50 dark:text-sky-300 dark:hover:bg-sky-950/40"
                          title="Requer senha definida (não legado sem senha)"
                        >
                          <ArrowLeftRight size={14} />
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
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-extrabold text-rose-700 hover:bg-rose-50 dark:border-slate-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
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
                          <label
                            htmlFor={`pwd-${row.email}`}
                            className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-400"
                          >
                            Nova senha
                          </label>
                          <input
                            id={`pwd-${row.email}`}
                            type="password"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder="Mínimo 4 caracteres"
                            autoComplete="new-password"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                        <button
                          type="submit"
                          className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-brand-700"
                        >
                          Guardar
                        </button>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
