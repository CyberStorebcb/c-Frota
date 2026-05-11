import { useEffect, useState } from 'react'
import { Search, Shield, Trash2, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

type SupabaseUser = {
  id: string
  email: string
  role: 'admin' | 'user'
  created_at: string
}

export function AdministradorPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<SupabaseUser[]>([])
  const [carregando, setCarregando] = useState(true)
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // Novo usuário
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [roleInput, setRoleInput] = useState<'user' | 'admin'>('user')
  const [criando, setCriando] = useState(false)

  const showMsg = (text: string, ok = true) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 4000)
  }

  const carregarUsuarios = async () => {
    setCarregando(true)
    // Busca perfis com email via join (requer service_role ou RPC)
    // Usamos a tabela profiles + auth.users via função RPC
    const { data, error } = await supabase.rpc('list_users_with_roles')
    if (error) {
      showMsg('Erro ao carregar usuários: ' + error.message, false)
    } else {
      setUsers((data as SupabaseUser[]) ?? [])
    }
    setCarregando(false)
  }

  useEffect(() => { void carregarUsuarios() }, [])

  const criarUsuario = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = emailInput.trim().toLowerCase()
    if (!email || passwordInput.length < 6) {
      showMsg('E-mail e senha (mín. 6 caracteres) são obrigatórios.', false)
      return
    }
    setCriando(true)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: passwordInput,
      email_confirm: true,
      user_metadata: { role: roleInput },
    })
    if (error || !data.user) {
      showMsg('Erro ao criar usuário: ' + (error?.message ?? 'desconhecido'), false)
      setCriando(false)
      return
    }
    // Garante que o profile tem o role correto
    await supabase.from('profiles').upsert({ id: data.user.id, role: roleInput })
    showMsg(`Usuário ${email} criado com sucesso!`)
    setEmailInput('')
    setPasswordInput('')
    setRoleInput('user')
    void carregarUsuarios()
    setCriando(false)
  }

  const removerUsuario = async (id: string, email: string) => {
    if (!confirm(`Remover ${email}?`)) return
    const { error } = await supabase.auth.admin.deleteUser(id)
    if (error) { showMsg('Erro ao remover: ' + error.message, false); return }
    showMsg(`${email} removido.`)
    void carregarUsuarios()
  }

  const alterarRole = async (id: string, novoRole: 'admin' | 'user') => {
    const { error } = await supabase.from('profiles').update({ role: novoRole }).eq('id', id)
    if (error) { showMsg('Erro ao alterar role: ' + error.message, false); return }
    showMsg('Role atualizado.')
    void carregarUsuarios()
  }

  const filtrados = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
          <Shield size={18} />
        </div>
        <div>
          <div className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">Administrador</div>
          <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">Gerenciamento de usuários</div>
        </div>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-extrabold ${
          msg.ok
            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300'
            : 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300'
        }`}>
          {msg.text}
        </div>
      )}

      {/* Criar usuário */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300">
          <UserPlus size={16} />
          Novo usuário
        </div>
        <form onSubmit={(e) => void criarUsuario(e)} className="grid gap-3 sm:grid-cols-4">
          <input
            type="email"
            placeholder="E-mail"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            required
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <input
            type="password"
            placeholder="Senha (mín. 6 caracteres)"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            required
            minLength={6}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <select
            value={roleInput}
            onChange={(e) => setRoleInput(e.target.value as 'user' | 'admin')}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="user">Usuário</option>
            <option value="admin">Administrador</option>
          </select>
          <button
            type="submit"
            disabled={criando}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {criando ? 'Criando...' : 'Criar'}
          </button>
        </form>
        <p className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
          ⚠ Requer chave de serviço (service_role) configurada no backend. Se receber erro de permissão, crie o usuário diretamente no painel do Supabase → Authentication → Users.
        </p>
      </div>

      {/* Lista de usuários */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
            <Search size={14} className="text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none dark:text-slate-100"
            />
          </div>
          <button
            type="button"
            onClick={() => void carregarUsuarios()}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Atualizar
          </button>
        </div>

        {carregando ? (
          <div className="py-12 text-center text-sm font-semibold text-slate-400">Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div className="py-12 text-center text-sm font-semibold text-slate-400">Nenhum usuário encontrado.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtrados.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-extrabold text-slate-900 dark:text-slate-100">{u.email}</div>
                  <div className="text-xs font-semibold text-slate-400">
                    {new Date(u.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <select
                  value={u.role}
                  onChange={(e) => void alterarRole(u.id, e.target.value as 'admin' | 'user')}
                  disabled={u.id === currentUser?.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-extrabold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 disabled:opacity-40"
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="button"
                  onClick={() => void removerUsuario(u.id, u.email)}
                  disabled={u.id === currentUser?.id}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100 disabled:opacity-30 dark:border-rose-800/50 dark:bg-rose-950/30"
                  title="Remover usuário"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
