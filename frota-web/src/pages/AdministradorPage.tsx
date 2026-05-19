import { useEffect, useState } from 'react'
import { KeyRound, RefreshCw, Search, Users, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

type ProfileRow = {
  id: string
  email: string
  role: 'admin' | 'user'
  created_at: string
}

export function UsuariosPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<ProfileRow[]>([])
  const [carregando, setCarregando] = useState(true)
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // Modal de redefinição de senha
  const [resetModal, setResetModal] = useState<{ id: string; email: string } | null>(null)
  const [novaSenha, setNovaSenha] = useState('')
  const [redefinindo, setRedefinindo] = useState(false)

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

  useEffect(() => {
    void (async () => {
      await Promise.resolve()
      setCarregando(true)
      const { data, error } = await supabase.rpc('list_users_with_roles')
      if (error) {
        showMsg('Erro ao carregar: ' + error.message, false)
      } else {
        setUsers((data as ProfileRow[]) ?? [])
      }
      setCarregando(false)
    })()
  }, [])

  const alterarRole = async (id: string, novoRole: 'admin' | 'user') => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: novoRole })
      .eq('id', id)
    if (error) { showMsg('Erro ao alterar role: ' + error.message, false); return }
    showMsg('Role atualizado com sucesso.')
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role: novoRole } : u))
  }

  const abrirResetModal = (u: ProfileRow) => {
    setResetModal({ id: u.id, email: u.email })
    setNovaSenha('')
  }

  const fecharResetModal = () => {
    setResetModal(null)
    setNovaSenha('')
  }

  const redefinirSenha = async () => {
    if (!resetModal || novaSenha.length < 6) return
    setRedefinindo(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { showMsg('Sessão expirada. Faça login novamente.', false); setRedefinindo(false); return }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ userId: resetModal.id, newPassword: novaSenha }),
        }
      )
      const json = await res.json() as { ok?: boolean; error?: string }
      if (json.ok) {
        showMsg(`Senha de ${resetModal.email} redefinida com sucesso.`)
        fecharResetModal()
      } else {
        showMsg('Erro: ' + (json.error ?? 'desconhecido'), false)
      }
    } catch {
      showMsg('Erro ao conectar com o servidor.', false)
    }
    setRedefinindo(false)
  }

  const filtrados = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
          <Users size={18} />
        </div>
        <div className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">Usuários</div>
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
            {users.length === 0 ? 'Nenhum usuário encontrado.' : 'Nenhum usuário corresponde à busca.'}
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
                <button
                  type="button"
                  onClick={() => abrirResetModal(u)}
                  title="Redefinir senha"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-extrabold text-slate-600 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <KeyRound size={12} />
                  Senha
                </button>
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

      {/* Modal redefinir senha */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound size={16} className="text-amber-500" />
                <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Redefinir senha</span>
              </div>
              <button type="button" onClick={fecharResetModal} className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <p className="mb-4 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{resetModal.email}</p>
            <input
              type="password"
              placeholder="Nova senha (mín. 6 caracteres)"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void redefinirSenha() }}
              className="mb-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-amber-400/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={fecharResetModal}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm font-extrabold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void redefinirSenha()}
                disabled={redefinindo || novaSenha.length < 6}
                className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-extrabold text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {redefinindo ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
