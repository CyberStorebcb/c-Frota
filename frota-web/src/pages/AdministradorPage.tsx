import { useEffect, useState } from 'react'
import { ExternalLink, RefreshCw, Search, Shield } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

type ProfileRow = {
  id: string
  email: string
  role: 'admin' | 'user'
  created_at: string
}

export function AdministradorPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<ProfileRow[]>([])
  const [carregando, setCarregando] = useState(true)
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const showMsg = (text: string, ok = true) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 4000)
  }

  const carregar = async () => {
    setCarregando(true)
    const { data, error } = await supabase.rpc('list_users_with_roles')
    if (error) {
      showMsg('Erro ao carregar: ' + error.message, false)
    } else {
      setUsers((data as ProfileRow[]) ?? [])
    }
    setCarregando(false)
  }

  useEffect(() => { void carregar() }, [])

  const alterarRole = async (id: string, novoRole: 'admin' | 'user') => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: novoRole })
      .eq('id', id)
    if (error) { showMsg('Erro ao alterar role: ' + error.message, false); return }
    showMsg('Role atualizado com sucesso.')
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role: novoRole } : u))
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
          <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Sessão: <span className="font-extrabold text-slate-700 dark:text-slate-200">{currentUser?.email}</span>
          </div>
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

      {/* Card: como adicionar usuários */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
        <div className="mb-2 text-sm font-extrabold text-amber-800 dark:text-amber-300">Como adicionar novos usuários</div>
        <ol className="space-y-1 text-sm font-semibold text-amber-700 dark:text-amber-400">
          <li>1. Acesse o painel do Supabase → <strong>Authentication → Users → Add user</strong></li>
          <li>2. Informe o e-mail e senha do usuário e confirme</li>
          <li>3. Clique em <strong>Atualizar</strong> abaixo para ver o usuário aqui</li>
          <li>4. Altere o role para <strong>Admin</strong> se necessário</li>
        </ol>
        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-700 underline hover:text-amber-900 dark:text-amber-400"
        >
          <ExternalLink size={12} />
          Abrir painel do Supabase
        </a>
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
            onClick={() => void carregar()}
            disabled={carregando}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw size={13} className={carregando ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>

        {carregando ? (
          <div className="py-12 text-center text-sm font-semibold text-slate-400">Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div className="py-12 text-center text-sm font-semibold text-slate-400">
            {users.length === 0
              ? 'Nenhum usuário encontrado. Execute o SQL da função list_users_with_roles no Supabase.'
              : 'Nenhum usuário corresponde à busca.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtrados.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-extrabold text-slate-900 dark:text-slate-100">{u.email}</div>
                  <div className="text-xs font-semibold text-slate-400">
                    Criado em {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    {u.id === currentUser?.id && (
                      <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-extrabold text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                        você
                      </span>
                    )}
                  </div>
                </div>
                <select
                  value={u.role}
                  onChange={(e) => void alterarRole(u.id, e.target.value as 'admin' | 'user')}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-extrabold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-slate-100 px-5 py-3 text-xs font-semibold text-slate-400 dark:border-slate-800">
          {users.length} usuário{users.length !== 1 ? 's' : ''} no total
        </div>
      </div>
    </div>
  )
}
