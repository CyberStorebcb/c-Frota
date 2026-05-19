import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type AuthUser = {
  id: string
  email: string
  role: 'admin' | 'user'
  mustChangePassword: boolean
}

type Ctx = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>
  logout: () => Promise<void>
  changePassword: (newPassword: string) => Promise<{ ok: true } | { ok: false; message: string }>
}

const AuthContext = createContext<Ctx | null>(null)

type ProfileRow = { role: string; must_change_password: boolean }

async function fetchProfile(userId: string, email: string): Promise<{ role: 'admin' | 'user'; mustChangePassword: boolean }> {
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL?.trim().toLowerCase()
  if (adminEmail && email.trim().toLowerCase() === adminEmail) {
    return { role: 'admin', mustChangePassword: false }
  }
  try {
    const { data } = await Promise.race([
      supabase.from('profiles').select('role, must_change_password').eq('id', userId).single(),
      new Promise<{ data: null }>((resolve) => setTimeout(() => resolve({ data: null }), 4000)),
    ])
    const p = data as ProfileRow | null
    return {
      role: p?.role === 'admin' ? 'admin' : 'user',
      mustChangePassword: p?.must_change_password ?? false,
    }
  } catch {
    return { role: 'user', mustChangePassword: false }
  }
}

function toAuthUser(supabaseUser: User, role: 'admin' | 'user', mustChangePassword: boolean): AuthUser {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    role,
    mustChangePassword,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 8000)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout)
      if (session?.user) {
        const { role, mustChangePassword } = await fetchProfile(session.user.id, session.user.email ?? '')
        setUser(toAuthUser(session.user, role, mustChangePassword))
      }
      setLoading(false)
    }).catch(() => { clearTimeout(timeout); setLoading(false) })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: Session | null) => {
        if (session?.user) {
          const { role, mustChangePassword } = await fetchProfile(session.user.id, session.user.email ?? '')
          setUser(toAuthUser(session.user, role, mustChangePassword))
        } else {
          setUser(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const login = useCallback(async (
    email: string,
    password: string,
  ): Promise<{ ok: true } | { ok: false; message: string }> => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) return { ok: false, message: 'E-mail ou senha incorretos.' }
    return { ok: true }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  const changePassword = useCallback(async (
    newPassword: string,
  ): Promise<{ ok: true } | { ok: false; message: string }> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { ok: false, message: error.message }

    // Limpa o flag no perfil
    if (user) {
      await supabase.from('profiles').update({ must_change_password: false }).eq('id', user.id)
      setUser((prev) => prev ? { ...prev, mustChangePassword: false } : prev)
    }
    return { ok: true }
  }, [user])

  const value = useMemo(
    () => ({ user, loading, login, logout, changePassword }),
    [user, loading, login, logout, changePassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook exposto junto ao provider
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
