import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Loader2, Lock, LogIn, Mail, MessageSquare, Moon, Sparkles, Sun, Zap } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { askGemini, isGeminiConfigured } from '../services/aiService'
import { useTheme } from '../theme/ThemeProvider'
import { renderFormattedText } from '../utils/renderFormattedAiText'

const FLUX_VB_H = 800
const FLUX_VB_W = 60
const FLUX_PERIOD = 80

function renderAiResponseRich(text: string): ReactNode {
  return renderFormattedText(text)
}

function buildFluxRailPath(totalH: number): string {
  const cx = 30
  let d = `M ${cx} 0`
  for (let y = 0; y + FLUX_PERIOD <= totalH; y += FLUX_PERIOD) {
    const midY = y + FLUX_PERIOD / 2
    const nextY = y + FLUX_PERIOD
    d += ` C 45 ${y + 20} 45 ${midY - 20} 30 ${midY}`
    d += ` C 15 ${midY + 20} 15 ${nextY - 20} 30 ${nextY}`
  }
  return d
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduced(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  return reduced
}

/** Comprimento sintético para dash-offset (mesmo `d` que o trilho; só animação visual). */
const FLUX_PATH_LENGTH = 1000

const FLUX_TRAIL_LAYERS: ReadonlyArray<{
  dash: string
  width: number
  stroke: string
  opacity: number
  durSec: number
  beginSec: number
}> = [
  { dash: '52 948', width: 11, stroke: '#1e3a5f', opacity: 0.55, durSec: 9.5, beginSec: 0 },
  { dash: '34 966', width: 7, stroke: '#38bdf8', opacity: 0.35, durSec: 8.2, beginSec: -1.1 },
  { dash: '18 982', width: 4, stroke: '#7dd3fc', opacity: 0.85, durSec: 7, beginSec: -2.2 },
]

function LoginFluxVisual({ reduced }: { reduced: boolean }) {
  const uid = useId().replace(/:/g, '')
  const pathId = `lfp-${uid}`
  const gooId = `lgoo-${uid}`
  const railPath = useMemo(() => buildFluxRailPath(FLUX_VB_H), [])

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${FLUX_VB_W} ${FLUX_VB_H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <filter id={gooId} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            result="goo"
          />
        </filter>
      </defs>
      {/* Geometria para animateMotion (sem trilho fixo visível) */}
      <path id={pathId} d={railPath} fill="none" stroke="none" strokeWidth="0" />
      {!reduced
        ? FLUX_TRAIL_LAYERS.map((layer, i) => (
            <path
              key={`trail-${i}`}
              d={railPath}
              pathLength={FLUX_PATH_LENGTH}
              fill="none"
              stroke={layer.stroke}
              strokeOpacity={layer.opacity}
              strokeWidth={layer.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={layer.dash}
            >
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to={String(FLUX_PATH_LENGTH)}
                dur={`${layer.durSec}s`}
                begin={`${layer.beginSec}s`}
                repeatCount="indefinite"
                calcMode="linear"
              />
            </path>
          ))
        : null}
      {!reduced ? (
        <g filter={`url(#${gooId})`}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <circle key={i} r="5" fill="#7dd3fc">
              <animateMotion dur={`${4 + i * 0.7}s`} repeatCount="indefinite" begin={`${i * -1.5}s`} rotate="auto">
                <mpath href={`#${pathId}`} />
              </animateMotion>
            </circle>
          ))}
        </g>
      ) : null}
    </svg>
  )
}

export function LoginPage() {
  const { user, login } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const reducedMotion = usePrefersReducedMotion()

  const fromRaw = (location.state as { from?: string } | null)?.from
  const from = fromRaw && fromRaw !== '/login' ? fromRaw : '/'
  const fromRegistroEspecial = Boolean((location.state as { fromRegistroEspecial?: boolean } | null)?.fromRegistroEspecial)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const [aiQuestion, setAiQuestion] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)

  useEffect(() => {
    if (!user || location.pathname !== '/login') return
    navigate(from, { replace: true })
  }, [user, location.pathname, from, navigate])

  async function askAiAssistant() {
    if (!aiQuestion.trim()) return

    setIsAiLoading(true)
    setAiResponse('')

    const systemPrompt = `Você é um assistente técnico especializado em manutenção de frotas de veículos e logística.
Responda de forma curta e objetiva em português. Se a pergunta for totalmente fora de frota, logística ou manutenção,
peça educadamente para focar nesses temas.
Para títulos ou itens de lista, usa markdown com **negrito** (ex.: **Pneus:**) e uma ideia por linha quando fizer sentido.`

    try {
      const result = await askGemini(aiQuestion.trim(), systemPrompt)
      if (result.ok === false) {
        if (result.kind === 'not_configured') {
          setAiResponse('O assistente não está disponível neste ambiente.')
        } else {
          setAiResponse(result.message)
        }
        return
      }
      setAiResponse(result.text)
    } finally {
      setIsAiLoading(false)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const res = await login(email, password, remember)
    setPending(false)
    if (res.ok === false) {
      setError(res.message)
      return
    }
  }

  const isDark = theme === 'dark'
  const geminiReady = isGeminiConfigured()

  return (
    <div
      className={`relative flex min-h-dvh w-full flex-col overflow-hidden transition-colors duration-500 sm:flex-row ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}
    >
      <button
        type="button"
        onClick={toggleTheme}
        className={`fixed z-50 flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm transition-all ${isDark ? 'border-slate-600/80 bg-slate-950/90 text-slate-300 backdrop-blur-sm hover:border-slate-500 hover:bg-slate-900 hover:text-white' : 'border-slate-200 bg-white/95 text-slate-600 backdrop-blur-sm hover:bg-slate-50'}`}
        style={{
          top: 'max(1rem, env(safe-area-inset-top, 0px))',
          right: 'max(1rem, env(safe-area-inset-right, 0px))',
        }}
        aria-label="Alternar tema"
      >
        {isDark ? <Sun size={20} strokeWidth={2} /> : <Moon size={20} strokeWidth={2} />}
      </button>

      <div
        className="pointer-events-none fixed inset-0 z-[1] flex select-none items-center justify-center overflow-hidden"
        aria-hidden
      >
        <span className="rotate-[-16deg] whitespace-nowrap text-[min(20vw,10rem)] font-black tracking-[0.32em] text-slate-900/[0.06] sm:text-[min(16vw,8rem)] dark:text-white/[0.08]">
          ItaloFontes
        </span>
      </div>

      <div className="relative z-10 hidden w-full shrink-0 overflow-hidden bg-[#0B1120] sm:block sm:w-1/3 lg:w-[400px]">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B1120] via-[#0a1628] to-[#050a14]" />
        <LoginFluxVisual reduced={reducedMotion} />

        <div className="relative z-10 flex h-full min-h-dvh flex-col justify-between p-8 text-white sm:min-h-0 sm:p-10 lg:p-12">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 shadow-lg shadow-blue-600/35 ring-1 ring-white/15">
              <Zap
                className="relative z-10 text-fuchsia-200 drop-shadow-[0_0_10px_rgba(232,121,249,0.75)]"
                size={24}
                strokeWidth={2.5}
                aria-hidden
              />
            </div>
            <span className="text-2xl font-black tracking-tighter text-white">
              Frota <span className="text-sky-400">Web</span>
            </span>
          </div>

          <div className="space-y-6 py-8">
            <h2 className="text-balance text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl">
              <span className="text-white">Sua frota sob</span>
              <br />
              <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-cyan-400 bg-clip-text text-transparent">controle</span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">total.</span>
            </h2>

            <div className="relative mt-6 overflow-hidden rounded-2xl border border-sky-400/25 shadow-[0_8px_32px_rgba(0,0,0,0.35)] ring-1 ring-white/5">
              {/* Listras diagonais + gradiente (visíveis através do vidro) */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: [
                    'repeating-linear-gradient(-36deg, rgba(56, 189, 248, 0.22) 0 12px, rgba(59, 130, 246, 0.1) 12px 26px, transparent 26px 40px)',
                    'linear-gradient(155deg, rgba(37, 99, 235, 0.45) 0%, rgba(14, 116, 144, 0.2) 45%, rgba(15, 23, 42, 0.75) 100%)',
                  ].join(','),
                }}
                aria-hidden
              />
              <div className="relative border-t border-white/10 bg-[#0B1120]/55 p-4 backdrop-blur-xl">
                <div className="mb-3 flex items-center gap-2 text-sky-400">
                  <Sparkles size={16} className="shrink-0 text-sky-300" strokeWidth={2.25} />
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-400">Assistente técnico</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    placeholder="Ex.: checklist antes de viagem longa"
                    className="w-full rounded-xl border border-sky-500/50 bg-black/40 py-2.5 pl-3 pr-10 text-xs font-medium text-white outline-none transition-all placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
                    onKeyDown={(e) => e.key === 'Enter' && void askAiAssistant()}
                    disabled={isAiLoading || !geminiReady}
                  />
                  <button
                    type="button"
                    onClick={() => void askAiAssistant()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-sky-400 hover:text-sky-300 disabled:opacity-50"
                    disabled={isAiLoading || !geminiReady}
                    aria-label="Enviar pergunta"
                  >
                    {isAiLoading ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} strokeWidth={2} />}
                  </button>
                </div>
                {!geminiReady ? (
                  <p className="mt-3 text-[11px] leading-relaxed text-slate-300/90">
                    <span>O assistente não está disponível neste ambiente.</span>
                    {import.meta.env.DEV ? (
                      <span className="mt-2 block border-t border-white/10 pt-2 text-[10px] italic text-slate-500">
                        Desenvolvimento: defina{' '}
                        <code className="rounded bg-black/30 px-1 font-mono not-italic text-slate-400">VITE_GEMINI_API_KEY</code> no ficheiro{' '}
                        <code className="rounded bg-black/30 px-1 font-mono not-italic text-slate-400">.env</code>
                        (opcionalmente <code className="rounded bg-black/30 px-1 font-mono not-italic text-slate-400">VITE_GEMINI_MODEL</code>).
                      </span>
                    ) : null}
                  </p>
                ) : null}
                {geminiReady && aiResponse ? (
                  <div className="mt-3 max-h-40 overflow-y-auto text-[11px] leading-relaxed text-slate-200/95">
                    {renderAiResponseRich(aiResponse)}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-600">Inteligência de transportes</div>
        </div>
      </div>

      <div
        className={`relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-8 pb-20 transition-colors duration-500 sm:px-8 sm:pb-16 ${isDark ? 'bg-slate-950' : 'bg-white'}`}
      >
        <div className="mb-6 flex w-full max-w-[380px] shrink-0 items-center sm:hidden">
          <div className="flex items-center gap-2">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 shadow-md shadow-blue-600/30 ring-1 ring-white/10">
              <Zap className="text-fuchsia-200 drop-shadow-[0_0_8px_rgba(232,121,249,0.65)]" size={20} strokeWidth={2.5} aria-hidden />
            </div>
            <span className={`text-lg font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Frota <span className="text-sky-500">Web</span>
            </span>
          </div>
        </div>

        <div className="w-full max-w-[380px]">
          <header className="mb-10 text-center sm:mb-12 sm:text-left">
            <h1 className={`text-3xl font-black tracking-tight sm:text-4xl ${isDark ? 'text-white' : 'text-slate-900'}`}>Acessar</h1>
            <p className="mt-2 text-sm font-bold text-slate-500 sm:mt-3 sm:text-base">Gestão e apontamentos da frota</p>
          </header>

          {fromRegistroEspecial ? (
            <div
              className="mb-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-center text-sm font-bold text-emerald-800 dark:text-emerald-200"
              role="status"
            >
              Registo de utilizador especial concluído. Inicie sessão com o e-mail e a palavra-passe que definiu.
            </div>
          ) : null}

          <form onSubmit={(e) => void onSubmit(e)} className="space-y-5 sm:space-y-6">
            <div className="group space-y-2">
              <label htmlFor="login-email" className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400 transition-colors group-focus-within:text-blue-500">
                E-mail corporativo
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500"
                  aria-hidden
                />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={pending}
                  className={`w-full rounded-2xl border py-4 pl-12 pr-4 text-sm font-bold outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60 ${isDark ? 'border-slate-800 bg-slate-900 text-white focus:bg-slate-950' : 'border-slate-200 bg-slate-50/80 text-slate-900 focus:bg-white'}`}
                  placeholder="voce@empresa.com.br"
                />
              </div>
            </div>

            <div className="group space-y-2">
              <div className="ml-1 flex items-center justify-between">
                <label htmlFor="login-password" className="text-[11px] font-black uppercase tracking-widest text-slate-400 transition-colors group-focus-within:text-blue-500">
                  Senha
                </label>
                <button type="button" className="text-[11px] font-black text-blue-600 hover:underline dark:text-blue-400">
                  Recuperar
                </button>
              </div>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500"
                  aria-hidden
                />
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={pending}
                  className={`w-full rounded-2xl border py-4 pl-12 pr-4 text-sm font-bold outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60 ${isDark ? 'border-slate-800 bg-slate-900 text-white focus:bg-slate-950' : 'border-slate-200 bg-slate-50/80 text-slate-900 focus:bg-white'}`}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <input
                id="login-remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={pending}
                className="size-4 rounded border-slate-300 accent-blue-600 focus:ring-2 focus:ring-blue-500/40 dark:border-slate-600 dark:bg-slate-900"
              />
              <label htmlFor="login-remember" className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Manter conectado neste dispositivo
              </label>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300" role="alert">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="group relative flex min-h-[56px] w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-slate-900 py-4 text-base font-black text-white shadow-xl transition-all hover:bg-blue-600 active:scale-[0.98] disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-blue-500 dark:hover:text-white"
            >
              {pending ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>
                  Entrar no sistema
                  <LogIn size={20} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <footer
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-[30] px-4 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-2 text-center text-[10px] font-semibold leading-snug text-slate-500/95 dark:text-slate-500"
        role="contentinfo"
      >
        © {new Date().getFullYear()} ItaloFontes · Todos os direitos reservados.
      </footer>
    </div>
  )
}
