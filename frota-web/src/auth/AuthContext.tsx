import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type AuthUser = {
  id: string
  email: string
  role: 'admin' | 'user'
}

type Ctx = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<Ctx | null>(null)

async function fetchRole(userId: string, email: string): Promise<'admin' | 'user'> {
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL?.trim().toLowerCase()
  if (adminEmail && email.trim().toLowerCase() === adminEmail) {
    // Garante que o e-mail de admin sempre tenha role=admin no banco
    await supabase.from('profiles').upsert({ id: userId, role: 'admin' }, { onConflict: 'id' })
    return 'admin'
  }
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  return (data?.role === 'admin') ? 'admin' : 'user'
}

function toAuthUser(supabaseUser: User, role: 'admin' | 'user'): AuthUser {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    role,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Carrega sessão existente
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const role = await fetchRole(session.user.id, session.user.email ?? '')
        setUser(toAuthUser(session.user, role))
      }
      setLoading(false)
    })

    // Escuta mudanças de auth (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: Session | null) => {
        if (session?.user) {
          const role = await fetchRole(session.user.id, session.user.email ?? '')
          setUser(toAuthUser(session.user, role))
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
    if (error) {
      return { ok: false, message: 'E-mail ou senha incorretos.' }
    }
    return { ok: true }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
