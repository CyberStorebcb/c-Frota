import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { canJustifyByEmail } from './canJustify'

export type AuthUser = {
  id: string
  email: string
  role: 'super_admin' | 'admin' | 'user'
  mustChangePassword: boolean
  /** true se o email pertence a um supervisor ou coordenador autorizado a justificar. */
  canJustify: boolean
}

type Ctx = {
  user: AuthUser | null
  loading: boolean
  isPasswordRecovery: boolean
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>
  logout: () => Promise<void>
  changePassword: (newPassword: string) => Promise<{ ok: true } | { ok: false; message: string }>
}

const AuthContext = createContext<Ctx | null>(null)

type ProfileRow = { role: string; must_change_password: boolean }

async function fetchProfile(userId: string, email: string): Promise<{ role: 'super_admin' | 'admin' | 'user'; mustChangePassword: boolean }> {
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL?.trim().toLowerCase()
  if (adminEmail && email.trim().toLowerCase() === adminEmail) {
    return { role: 'super_admin', mustChangePassword: false }
  }
  try {
    const { data } = await Promise.race([
      supabase.from('profiles').select('role, must_change_password').eq('id', userId).single(),
      new Promise<{ data: null }>((resolve) => setTimeout(() => resolve({ data: null }), 4000)),
    ])
    const p = data as ProfileRow | null
    const rawRole = p?.role ?? 'user'
    const role: 'super_admin' | 'admin' | 'user' =
      rawRole === 'super_admin' ? 'super_admin'
      : rawRole === 'admin' ? 'admin'
      : 'user'
    return { role, mustChangePassword: p?.must_change_password ?? false }
  } catch {
    return { role: 'user', mustChangePassword: false }
  }
}

function toAuthUser(supabaseUser: User, role: 'super_admin' | 'admin' | 'user', mustChangePassword: boolean): AuthUser {
  const email = supabaseUser.email ?? ''
  return {
    id: supabaseUser.id,
    email,
    role,
    mustChangePassword,
    canJustify: role === 'admin' || role === 'super_admin' || canJustifyByEmail(email),
  }
}

/** Usuário fictício para captura de screenshots em dev (localStorage frota.screenshot.bypass=1). */
const SCREENSHOT_MOCK_USER: AuthUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'apresentacao@cgbengenharia.com.br',
  role: 'super_admin',
  mustChangePassword: false,
  canJustify: true,
}

function readScreenshotBypassUser(): AuthUser | null {
  if (!import.meta.env.DEV) return null
  try {
    if (localStorage.getItem('frota.screenshot.bypass') === '1') return SCREENSHOT_MOCK_USER
  } catch { /* storage indisponível */ }
  return null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readScreenshotBypassUser())
  const [loading, setLoading] = useState(() => !readScreenshotBypassUser())
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  useEffect(() => {
    const bypass = readScreenshotBypassUser()
    if (bypass) {
      setUser(bypass)
      setLoading(false)
      return
    }

    // onAuthStateChange dispara ANTES de getSession() retornar quando há um
    // token de recovery no hash da URL (fluxo de redefinição de senha via link).
    // Por isso ele é o responsável por setar loading=false, garantindo que o
    // RequireAuth não redirecione antes da sessão de recovery ser estabelecida.
    let initialEventFired = false
    const timeout = setTimeout(() => setLoading(false), 8000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        // USER_UPDATED é disparado pelo updateUser() durante troca de senha.
        // Ignorar para não sobrescrever o mustChangePassword que já foi limpo localmente.
        if (event === 'USER_UPDATED') return

        if (!initialEventFired) {
          initialEventFired = true
          clearTimeout(timeout)
        }

        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true)
        }

        if (session?.user) {
          const { role, mustChangePassword } = await fetchProfile(session.user.id, session.user.email ?? '')
          setUser(toAuthUser(session.user, role, mustChangePassword))
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    // getSession() como fallback: se onAuthStateChange não disparar (sem sessão,
    // sem hash de recovery), ele encerra o loading após resolver.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (initialEventFired) return  // onAuthStateChange já tratou
      clearTimeout(timeout)
      if (session?.user) {
        const { role, mustChangePassword } = await fetchProfile(session.user.id, session.user.email ?? '')
        setUser(toAuthUser(session.user, role, mustChangePassword))
      }
      setLoading(false)
    }).catch(() => { clearTimeout(timeout); setLoading(false) })

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
    const { error: authError } = await supabase.auth.updateUser({ password: newPassword })
    if (authError) return { ok: false, message: authError.message }

    // Atualiza o perfil após confirmar que a senha foi trocada com sucesso.
    // Tenta via RPC service-role primeiro, depois via update direto.
    if (user) {
      const { error: profileError, data: profileData } = await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', user.id)
        .select('id')
      if (profileError || !profileData?.length) {
        // Fallback: tenta via RPC (se existir) ou ignora — o estado local ainda é atualizado
        await supabase.rpc('clear_must_change_password', { user_id: user.id }).maybeSingle()
      }
    }

    // Atualiza estado local imediatamente — o listener USER_UPDATED é ignorado
    setUser((prev) => prev ? { ...prev, mustChangePassword: false } : prev)
    setIsPasswordRecovery(false)
    return { ok: true }
  }, [user])

  const value = useMemo(
    () => ({ user, loading, isPasswordRecovery, login, logout, changePassword }),
    [user, loading, isPasswordRecovery, login, logout, changePassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook exposto junto ao provider
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
