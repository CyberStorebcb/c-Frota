import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { isAccessArea, type AccessArea } from '../access/accessAreas'
import { readAllowlist } from '../access/allowlist'
import { findSpecialUserLogin } from '../access/specialUsers'

const STORAGE_KEY = 'frota.session'

export type AuthUser =
  | { email: string; role: 'admin' }
  | { email: string; role: 'user'; userKind: 'normal' }
  | { email: string; role: 'user'; userKind: 'special'; area: AccessArea }

type Ctx = {
  user: AuthUser | null
  login: (email: string, password: string, remember: boolean) => Promise<{ ok: true } | { ok: false; message: string }>
  logout: () => void
}

const AuthContext = createContext<Ctx | null>(null)

function readStoredSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      email?: string
      role?: string
      userKind?: string
      area?: string
    }
    if (!parsed.email || typeof parsed.email !== 'string') return null
    const email = parsed.email.trim()
    const role = parsed.role === 'admin' ? 'admin' : 'user'
    if (role === 'admin') return { email, role: 'admin' }

    if (parsed.userKind === 'special' && isAccessArea(String(parsed.area))) {
      return { email, role: 'user', userKind: 'special', area: parsed.area as AccessArea }
    }
    return { email, role: 'user', userKind: 'normal' }
  } catch {
    return null
  }
}

function writeSession(user: AuthUser, remember: boolean) {
  const base: Record<string, unknown> = { email: user.email, role: user.role }
  if (user.role === 'user') {
    base.userKind = user.userKind
    if (user.userKind === 'special') {
      base.area = user.area
    }
  }
  const payload = JSON.stringify(base)
  localStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(STORAGE_KEY)
  if (remember) localStorage.setItem(STORAGE_KEY, payload)
  else sessionStorage.setItem(STORAGE_KEY, payload)
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(STORAGE_KEY)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredSession())

  const login = useCallback(async (email: string, password: string, remember: boolean): Promise<
    { ok: true } | { ok: false; message: string }
  > => {
    const e = email.trim()
    if (!e) return { ok: false, message: 'Informe o e-mail.' }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { ok: false, message: 'E-mail inválido.' }

    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL?.trim().toLowerCase()
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD
    const adminPasswordStr = typeof adminPassword === 'string' ? adminPassword : ''
    const adminConfigured = Boolean(adminEmail && adminPasswordStr.length > 0)

    if (adminConfigured && e.toLowerCase() === adminEmail) {
      if (password !== adminPasswordStr) {
        await new Promise((r) => setTimeout(r, 350))
        return { ok: false, message: 'E-mail ou senha incorretos.' }
      }
      await new Promise((r) => setTimeout(r, 350))
      const next: AuthUser = { email: e, role: 'admin' }
      writeSession(next, remember)
      setUser(next)
      return { ok: true }
    }

    const special = findSpecialUserLogin(e, password)
    if (special) {
      await new Promise((r) => setTimeout(r, 350))
      const next: AuthUser = { email: e, role: 'user', userKind: 'special', area: special.area }
      writeSession(next, remember)
      setUser(next)
      return { ok: true }
    }

    const allowlist = readAllowlist()

    if (allowlist.length === 0) {
      if (password.length < 4) return { ok: false, message: 'Senha deve ter pelo menos 4 caracteres.' }
      await new Promise((r) => setTimeout(r, 350))
      const next: AuthUser = { email: e, role: 'user', userKind: 'normal' }
      writeSession(next, remember)
      setUser(next)
      return { ok: true }
    }

    const entry = allowlist.find((u) => u.email === e.toLowerCase())
    if (!entry) {
      await new Promise((r) => setTimeout(r, 350))
      return { ok: false, message: 'Acesso não autorizado para este e-mail. Contacte o administrador.' }
    }

    if (entry.password) {
      if (password !== entry.password) {
        await new Promise((r) => setTimeout(r, 350))
        return { ok: false, message: 'E-mail ou senha incorretos.' }
      }
    } else if (password.length < 4) {
      return { ok: false, message: 'Senha deve ter pelo menos 4 caracteres.' }
    }

    await new Promise((r) => setTimeout(r, 350))

    const next: AuthUser = { email: e, role: 'user', userKind: 'normal' }
    writeSession(next, remember)
    setUser(next)
    return { ok: true }
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
