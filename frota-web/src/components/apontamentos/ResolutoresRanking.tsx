import { useEffect, useState } from 'react'
import { Crown, Medal, Sparkles, Trophy, Zap } from 'lucide-react'

export function primeiroNomeDoEmail(email: string): string {
  const local = email.split('@')[0] ?? ''
  const parte = local.split('.')[0] ?? local
  return parte.toUpperCase()
}

export type ResolutorRankingEntry = {
  email: string | null
  nome: string
  count: number
}

/** Exclui resoluções sem e-mail válido (ex.: legado `desconhecido` gravado no banco). */
export function isResolutorIdentificado(resolvidoPor: string | null | undefined): boolean {
  const email = resolvidoPor?.trim()
  if (!email) return false
  if (!email.includes('@')) return false
  if (email.toLowerCase() === 'desconhecido') return false
  return true
}

export function buildResolutoresRanking(
  rows: { resolvido: boolean; resolvidoPor: string | null }[],
  nomeFromEmail: (email: string) => string,
): ResolutorRankingEntry[] {
  const counts = new Map<string, ResolutorRankingEntry>()

  for (const row of rows) {
    if (!row.resolvido) continue
    const email = row.resolvidoPor?.trim() || null
    if (!isResolutorIdentificado(email)) continue
    const key = email!.toLowerCase()
    const existing = counts.get(key)
    if (existing) {
      existing.count += 1
      continue
    }
    counts.set(key, {
      email,
      nome: nomeFromEmail(email!),
      count: 1,
    })
  }

  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.nome.localeCompare(b.nome, 'pt-BR'),
  )
}

const PODIUM_ORDER = [1, 0, 2] as const
const PODIUM_HEIGHT = ['h-[92px]', 'h-[128px]', 'h-[76px]'] as const
const PODIUM_MEDAL = [
  {
    ring: 'ring-slate-400/80',
    badge: 'bg-gradient-to-br from-slate-300 to-slate-500 text-slate-900',
    bar: 'from-slate-400 to-slate-600',
    glow: 'shadow-slate-400/20',
    label: '2º',
    icon: Medal,
  },
  {
    ring: 'ring-amber-300/90',
    badge: 'rank-gold-shimmer text-amber-950',
    bar: 'from-amber-400 to-amber-600',
    glow: 'shadow-amber-400/30',
    label: '1º',
    icon: Crown,
  },
  {
    ring: 'ring-orange-400/70',
    badge: 'bg-gradient-to-br from-orange-300 to-orange-600 text-orange-950',
    bar: 'from-orange-400 to-orange-600',
    glow: 'shadow-orange-400/20',
    label: '3º',
    icon: Medal,
  },
] as const

function useAnimatedCounter(target: number, duration = 1100) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let start: number | null = null
    let raf = 0
    const step = (ts: number) => {
      if (start === null) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const eased = 1 - (1 - progress) ** 3
      setValue(Math.round(target * eased))
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    setValue(0)
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}

function AnimatedScore({ value, className }: { value: number; className?: string }) {
  const display = useAnimatedCounter(value)
  return <span className={className}>{display}</span>
}

function FloatingParticles({ count = 6 }: { count?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="rank-particle absolute h-1 w-1 rounded-full bg-amber-300/90"
          style={{
            left: `${12 + (i * 14) % 76}%`,
            bottom: `${18 + (i % 3) * 12}%`,
            ['--particle-delay' as string]: `${i * 320}ms`,
          }}
        />
      ))}
    </div>
  )
}

function PodiumCard({
  entry,
  slotIndex,
  maxCount,
}: {
  entry: ResolutorRankingEntry | undefined
  slotIndex: number
  maxCount: number
}) {
  const medal = PODIUM_MEDAL[slotIndex]!
  const height = PODIUM_HEIGHT[slotIndex]!
  const Icon = medal.icon
  const isFirst = slotIndex === 1
  const pct = entry ? Math.max(14, Math.round((entry.count / maxCount) * 100)) : 0

  if (!entry) {
    return (
      <div className="flex flex-1 flex-col items-center justify-end opacity-25">
        <div className={`w-full rounded-t-2xl border border-dashed border-white/10 bg-white/5 ${height}`} />
      </div>
    )
  }

  return (
    <div
      className="rank-podium-enter flex flex-1 flex-col items-center justify-end"
      style={{ ['--podium-i' as string]: slotIndex }}
    >
      <div
        className={`relative mb-2 flex w-full max-w-[140px] flex-col items-center text-center transition duration-300 hover:scale-[1.03] ${
          isFirst ? 'z-10' : ''
        }`}
      >
        {isFirst ? (
          <>
            <FloatingParticles />
            <Sparkles
              size={16}
              className="rank-crown-float absolute -right-1 -top-1 text-amber-300/90"
              aria-hidden
            />
            <Crown
              size={20}
              className="rank-crown-float mb-1 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.75)]"
              aria-hidden
            />
          </>
        ) : null}
        <div
          className={`grid h-10 w-10 place-items-center rounded-full ring-2 ${medal.ring} ${medal.badge} shadow-lg ${medal.glow}`}
        >
          <Icon size={16} aria-hidden />
        </div>
        <p className="mt-2 max-w-full truncate text-sm font-black uppercase tracking-wide text-white">
          {entry.nome}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80">{medal.label} lugar</p>
        {entry.email ? (
          <p className="mt-0.5 max-w-full truncate px-1 text-[9px] font-semibold text-slate-500" title={entry.email}>
            {entry.email}
          </p>
        ) : null}
        <AnimatedScore
          value={entry.count}
          className="rank-score-pop mt-1 text-3xl font-black tabular-nums text-emerald-300"
        />
      </div>
      <div
        className={`relative flex w-full flex-col justify-end overflow-hidden rounded-t-2xl border border-emerald-400/25 bg-gradient-to-t from-emerald-950/90 via-emerald-900/60 to-emerald-700/30 shadow-[0_-10px_40px_rgba(16,185,129,0.2)] ${height} ${
          isFirst ? 'ring-1 ring-amber-400/35' : ''
        }`}
      >
        {isFirst ? (
          <Zap size={14} className="absolute right-2 top-2 text-amber-300/70" aria-hidden />
        ) : null}
        <div className="px-2 pb-2">
          <div className="h-2 overflow-hidden rounded-full bg-black/25">
            <div
              className={`rank-bar-fill h-full rounded-full bg-gradient-to-r ${medal.bar}`}
              style={{ width: `${pct}%`, ['--rank-i' as string]: slotIndex }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function LeaderboardRow({
  entry,
  rank,
  maxCount,
  index,
}: {
  entry: ResolutorRankingEntry
  rank: number
  maxCount: number
  index: number
}) {
  const pct = Math.max(8, Math.round((entry.count / maxCount) * 100))

  return (
    <li
      className="rank-row-enter group relative flex items-center gap-3 rounded-2xl border border-white/5 bg-slate-900/50 px-3 py-3 backdrop-blur-sm transition hover:scale-[1.01] hover:border-emerald-400/25 hover:bg-slate-900/80"
      style={{ ['--rank-i' as string]: index + 3 }}
    >
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-xs font-black text-slate-300 ring-1 ring-white/5 transition group-hover:bg-emerald-600 group-hover:text-white">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-extrabold uppercase tracking-wide text-slate-100">{entry.nome}</p>
        {entry.email ? (
          <p className="truncate text-[10px] font-semibold text-slate-500">{entry.email}</p>
        ) : null}
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div
            className="rank-bar-fill h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
            style={{ width: `${pct}%`, ['--rank-i' as string]: index + 3 }}
          />
        </div>
      </div>
      <AnimatedScore
        value={entry.count}
        className="shrink-0 text-lg font-black tabular-nums text-emerald-300"
      />
    </li>
  )
}

type Props = {
  entries: ResolutorRankingEntry[]
  totalResolvidos: number
}

export function ResolutoresRanking({ entries, totalResolvidos }: Props) {
  if (entries.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-emerald-500/30 bg-slate-950/80 px-6 py-16 text-center">
        <Trophy size={36} className="mx-auto mb-4 text-emerald-500/50" aria-hidden />
        <p className="text-sm font-extrabold text-emerald-100">Nenhuma resolução no período</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Ajuste os filtros ou marque apontamentos como resolvidos em Gerenciar.
        </p>
      </div>
    )
  }

  const maxCount = entries[0]?.count ?? 1
  const top3 = entries.slice(0, 3)
  const restantes = entries.slice(3)
  const totalAnimated = useAnimatedCounter(totalResolvidos, 900)

  return (
    <div className="rank-arena relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 shadow-[0_0_80px_rgba(16,185,129,0.08)]">
      <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl rank-arena-glow-emerald" aria-hidden />
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-teal-500/10 blur-3xl rank-arena-glow-rose" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden
      />

      <div className="relative p-5 sm:p-6">
        <div className="rank-row-enter mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
              <Trophy size={20} aria-hidden />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400 ring-2 ring-slate-950" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black uppercase tracking-[0.18em] text-emerald-300">Ranking de resoluções</h2>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-400 ring-1 ring-emerald-500/30">
                  Ao vivo
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-400">
                <span className="font-black tabular-nums text-emerald-300">{totalAnimated}</span>
                {' '}resolvido{totalResolvidos !== 1 ? 's' : ''} no período
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
            <Zap size={12} aria-hidden />
            Top {Math.min(entries.length, 3)} competidores
          </div>
        </div>

        {top3.length > 0 ? (
          <div
            className="rank-row-enter mb-5 rounded-2xl border border-emerald-500/15 bg-slate-950/40 p-4 ring-1 ring-emerald-400/10"
            style={{ ['--rank-i' as string]: 1 }}
          >
            <p className="mb-4 text-center text-[10px] font-black uppercase tracking-[0.28em] text-emerald-400/70">
              Pódio
            </p>
            <div className="flex items-end gap-2 px-1 sm:gap-3">
              {PODIUM_ORDER.map((entryIndex, slotIndex) => (
                <PodiumCard
                  key={slotIndex}
                  entry={top3[entryIndex]}
                  slotIndex={slotIndex}
                  maxCount={maxCount}
                />
              ))}
            </div>
          </div>
        ) : null}

        {restantes.length > 0 ? (
          <div>
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Classificação geral
            </p>
            <ul className="space-y-2">
              {restantes.map((entry, index) => (
                <LeaderboardRow
                  key={entry.email ?? `desconhecido-${index + 4}`}
                  entry={entry}
                  rank={index + 4}
                  maxCount={maxCount}
                  index={index}
                />
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}
