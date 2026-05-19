import { useState, type FormEvent } from 'react'
import { KeyRound, Eye, EyeOff, ShieldCheck, LogOut } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

export function PrimeiroAcessoPage() {
  const { user, changePassword, logout } = useAuth()
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [showNova, setShowNova] = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErro('')

    if (novaSenha.length < 8) {
      setErro('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (novaSenha !== confirmar) {
      setErro('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const res = await changePassword(novaSenha)
    setLoading(false)

    if (!res.ok) {
      setErro('Não foi possível alterar a senha. Tente novamente.')
    }
    // Se ok, o AuthContext já limpa mustChangePassword e o RequireAuth libera a entrada
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        {/* Ícone */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-600/20 ring-1 ring-blue-500/30">
            <ShieldCheck size={28} className="text-blue-400" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-black text-white">Defina sua senha</h1>
            <p className="mt-1 text-sm font-medium text-slate-400">
              Este é seu primeiro acesso. Crie uma senha pessoal para continuar.
            </p>
          </div>
          {user && (
            <p className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300">
              {user.email}
            </p>
          )}
        </div>

        {/* Formulário */}
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          {/* Nova senha */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Nova senha
            </label>
            <div className="relative">
              <KeyRound size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showNova ? 'text' : 'password'}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-10 pr-10 text-sm font-medium text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={() => setShowNova((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                tabIndex={-1}
              >
                {showNova ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirmar senha */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Confirmar senha
            </label>
            <div className="relative">
              <KeyRound size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showConfirmar ? 'text' : 'password'}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                placeholder="Repita a senha"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-10 pr-10 text-sm font-medium text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={() => setShowConfirmar((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                tabIndex={-1}
              >
                {showConfirmar ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Indicador de força */}
          {novaSenha.length > 0 && (
            <div className="flex items-center gap-2">
              {[4, 6, 8, 10].map((min, i) => (
                <div
                  key={min}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    novaSenha.length >= min
                      ? i < 2 ? 'bg-rose-500' : i === 2 ? 'bg-amber-400' : 'bg-emerald-500'
                      : 'bg-slate-700'
                  }`}
                />
              ))}
              <span className="text-[10px] font-bold text-slate-500">
                {novaSenha.length < 6 ? 'Fraca' : novaSenha.length < 8 ? 'Regular' : novaSenha.length < 10 ? 'Boa' : 'Forte'}
              </span>
            </div>
          )}

          {/* Erro */}
          {erro && (
            <p className="rounded-xl bg-rose-950/50 px-3 py-2 text-xs font-semibold text-rose-400">
              {erro}
            </p>
          )}

          {/* Botão */}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-extrabold text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <ShieldCheck size={16} />
            )}
            {loading ? 'Salvando…' : 'Definir senha e entrar'}
          </button>
        </form>

        {/* Sair */}
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-4 flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-300"
        >
          <LogOut size={13} />
          Sair e fazer login com outra conta
        </button>
      </div>
    </div>
  )
}
