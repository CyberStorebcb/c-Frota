import { formatDefeitoParaExibicao } from './defeitoExibicao'

export type ResolvidoScreenshotItem = {
  veiculoLabel: string
  defeito: string
  base: string
  coordenador: string
  responsavel: string
  dataApontamento: string
  dataResolvido: string | null
  reparoValor: number | null
  reparoDescricao: string | null
  imperativo: boolean
}

export type ResolvidosScreenshotInput = {
  items: ResolvidoScreenshotItem[]
  periodoLabel?: string
  geradoEm?: Date
  filtros?: { label: string; valor: string }[]
}

const SCALE = 2
const W = 1440
const FONT = '"Segoe UI", Inter, system-ui, -apple-system, sans-serif'

const PAD = 48
const HEADER_H = 220
const KPI_H = 130
const TABLE_HEADER_H = 56
const ROW_H = 64
const FOOTER_H = 64

const C = {
  bgFrom: '#020617',
  bgTo: '#0f172a',
  glow: '#10b981',
  ink: '#f1f5f9',
  muted: '#94a3b8',
  subtle: '#64748b',
  line: 'rgba(148, 163, 184, 0.12)',
  card: 'rgba(16, 185, 129, 0.06)',
  cardBorder: 'rgba(16, 185, 129, 0.22)',
  rowEven: 'rgba(15, 23, 42, 0.55)',
  rowOdd: 'rgba(15, 23, 42, 0.35)',
  emerald: '#10b981',
  emeraldSoft: 'rgba(16, 185, 129, 0.15)',
  rose: '#f43f5e',
  amber: '#f59e0b',
  sky: '#38bdf8',
  brand: '#3b82f6',
} as const

type Ctx = CanvasRenderingContext2D

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h)
  ctx.lineTo(x + rr, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr)
  ctx.lineTo(x, y + rr)
  ctx.quadraticCurveTo(x, y, x + rr, y)
  ctx.closePath()
}

function truncate(ctx: Ctx, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  const ellipsis = '…'
  let lo = 0
  let hi = text.length
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2)
    if (ctx.measureText(text.slice(0, mid) + ellipsis).width <= maxWidth) lo = mid
    else hi = mid - 1
  }
  return text.slice(0, lo) + ellipsis
}

function formatBR(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCurrency(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return (v / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function daysBetween(a: string, b: string | null): number | null {
  if (!b) return null
  const [ya, ma, da] = a.slice(0, 10).split('-').map(Number)
  const [yb, mb, db] = b.slice(0, 10).split('-').map(Number)
  if (!ya || !yb) return null
  const ta = new Date(ya, ma - 1, da).getTime()
  const tb = new Date(yb, mb - 1, db).getTime()
  return Math.round((tb - ta) / 86_400_000)
}

export function generateResolvidosScreenshot(input: ResolvidosScreenshotInput): string {
  const items = input.items
  const rowsH = Math.max(items.length, 1) * ROW_H
  const totalH = HEADER_H + KPI_H + TABLE_HEADER_H + rowsH + FOOTER_H + PAD * 2

  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = totalH * SCALE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d indisponível')
  ctx.scale(SCALE, SCALE)
  ctx.textBaseline = 'middle'

  // Background com gradiente
  const grad = ctx.createLinearGradient(0, 0, 0, totalH)
  grad.addColorStop(0, C.bgFrom)
  grad.addColorStop(1, C.bgTo)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, totalH)

  // Glow orbs no fundo (visual moderno)
  const glow1 = ctx.createRadialGradient(W - 180, 120, 0, W - 180, 120, 420)
  glow1.addColorStop(0, 'rgba(16, 185, 129, 0.25)')
  glow1.addColorStop(1, 'rgba(16, 185, 129, 0)')
  ctx.fillStyle = glow1
  ctx.fillRect(0, 0, W, totalH)

  const glow2 = ctx.createRadialGradient(120, totalH - 180, 0, 120, totalH - 180, 380)
  glow2.addColorStop(0, 'rgba(59, 130, 246, 0.18)')
  glow2.addColorStop(1, 'rgba(59, 130, 246, 0)')
  ctx.fillStyle = glow2
  ctx.fillRect(0, 0, W, totalH)

  // ─── Header ──────────────────────────────────────────────────────────────
  const headerX = PAD
  const headerY = PAD
  const headerW = W - PAD * 2

  // Badge "RELATÓRIO"
  ctx.fillStyle = C.emeraldSoft
  roundRect(ctx, headerX, headerY, 140, 32, 16)
  ctx.fill()
  ctx.fillStyle = C.emerald
  ctx.font = `900 11px ${FONT}`
  ctx.textAlign = 'center'
  ctx.fillText('✓ RELATÓRIO', headerX + 70, headerY + 16)

  // Título
  ctx.textAlign = 'left'
  ctx.fillStyle = C.ink
  ctx.font = `900 44px ${FONT}`
  ctx.fillText('Defeitos Resolvidos', headerX, headerY + 80)

  // Subtítulo
  ctx.fillStyle = C.muted
  ctx.font = `600 16px ${FONT}`
  const sub = input.periodoLabel
    ? `Frota CGB · ${input.periodoLabel}`
    : 'Frota CGB · Histórico de resoluções'
  ctx.fillText(sub, headerX, headerY + 116)

  // Filtros ativos (se houver)
  if (input.filtros && input.filtros.length > 0) {
    let fx = headerX
    const fy = headerY + 152
    ctx.font = `700 11px ${FONT}`
    for (const f of input.filtros) {
      const txt = `${f.label}: ${f.valor}`
      const tw = ctx.measureText(txt).width + 24
      ctx.fillStyle = 'rgba(59, 130, 246, 0.15)'
      roundRect(ctx, fx, fy, tw, 26, 13)
      ctx.fill()
      ctx.fillStyle = C.sky
      ctx.textAlign = 'center'
      ctx.fillText(txt, fx + tw / 2, fy + 13)
      ctx.textAlign = 'left'
      fx += tw + 8
      if (fx > headerW - 200) break
    }
  }

  // Data de geração no canto direito
  const gerado = input.geradoEm ?? new Date()
  const geradoStr = gerado.toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  ctx.fillStyle = C.subtle
  ctx.font = `600 12px ${FONT}`
  ctx.textAlign = 'right'
  ctx.fillText(`Gerado em ${geradoStr}`, headerX + headerW, headerY + 18)
  ctx.textAlign = 'left'

  // ─── KPIs ────────────────────────────────────────────────────────────────
  const kpiY = headerY + HEADER_H - 20
  const kpiCount = 3
  const kpiGap = 16
  const kpiW = (headerW - kpiGap * (kpiCount - 1)) / kpiCount

  const totalResolvidos = items.length
  const totalCusto = items.reduce((s, i) => s + (i.reparoValor ?? 0), 0)
  const tempoMedio = (() => {
    const tempos = items.map((i) => daysBetween(i.dataApontamento, i.dataResolvido)).filter((v): v is number => v != null && v >= 0)
    if (tempos.length === 0) return null
    return Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length)
  })()

  const kpis: { label: string; value: string; accent: string; icon: string }[] = [
    { label: 'Total resolvidos', value: String(totalResolvidos), accent: C.emerald, icon: '✓' },
    { label: 'Custo total', value: formatCurrency(totalCusto), accent: C.amber, icon: '$' },
    { label: 'Tempo médio', value: tempoMedio != null ? `${tempoMedio} dias` : '—', accent: C.sky, icon: '⏱' },
  ]

  kpis.forEach((kpi, i) => {
    const x = headerX + i * (kpiW + kpiGap)
    // Card
    ctx.fillStyle = C.card
    roundRect(ctx, x, kpiY, kpiW, KPI_H - 20, 20)
    ctx.fill()
    ctx.strokeStyle = kpi.accent + '40'
    ctx.lineWidth = 1.5
    roundRect(ctx, x, kpiY, kpiW, KPI_H - 20, 20)
    ctx.stroke()

    // Barra lateral
    ctx.fillStyle = kpi.accent
    roundRect(ctx, x, kpiY, 4, KPI_H - 20, 2)
    ctx.fill()

    // Icon circle
    ctx.fillStyle = kpi.accent + '20'
    ctx.beginPath()
    ctx.arc(x + 40, kpiY + 38, 18, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = kpi.accent
    ctx.font = `900 18px ${FONT}`
    ctx.textAlign = 'center'
    ctx.fillText(kpi.icon, x + 40, kpiY + 38)

    // Label
    ctx.fillStyle = C.muted
    ctx.font = `800 10px ${FONT}`
    ctx.textAlign = 'left'
    const labelText = kpi.label.toUpperCase()
    ctx.fillText(labelText, x + 68, kpiY + 30)

    // Value
    ctx.fillStyle = C.ink
    ctx.font = `900 28px ${FONT}`
    ctx.fillText(kpi.value, x + 68, kpiY + 60)
  })

  // ─── Tabela ──────────────────────────────────────────────────────────────
  const tableY = headerY + HEADER_H + KPI_H - 20
  const cols = [
    { key: 'veiculo', label: 'VEÍCULO', w: 220 },
    { key: 'defeito', label: 'DEFEITO', w: 360 },
    { key: 'base', label: 'BASE', w: 100 },
    { key: 'responsavel', label: 'RESPONSÁVEL', w: 180 },
    { key: 'apontado', label: 'APONTADO', w: 130 },
    { key: 'resolvido', label: 'RESOLVIDO', w: 130 },
    { key: 'tempo', label: 'TEMPO', w: 100 },
    { key: 'custo', label: 'CUSTO', w: 0 }, // resto
  ]
  const totalDefinedW = cols.slice(0, -1).reduce((s, c) => s + c.w, 0)
  cols[cols.length - 1].w = headerW - totalDefinedW

  // Header da tabela
  ctx.fillStyle = 'rgba(16, 185, 129, 0.08)'
  roundRect(ctx, headerX, tableY, headerW, TABLE_HEADER_H, 12)
  ctx.fill()

  ctx.fillStyle = C.emerald
  ctx.font = `900 11px ${FONT}`
  let cx = headerX + 20
  for (const col of cols) {
    ctx.fillText(col.label, cx, tableY + TABLE_HEADER_H / 2)
    cx += col.w
  }

  // Rows
  if (items.length === 0) {
    ctx.fillStyle = C.muted
    ctx.font = `600 16px ${FONT}`
    ctx.textAlign = 'center'
    ctx.fillText('Nenhum defeito resolvido no período', headerX + headerW / 2, tableY + TABLE_HEADER_H + ROW_H / 2)
    ctx.textAlign = 'left'
  } else {
    items.forEach((item, idx) => {
      const ry = tableY + TABLE_HEADER_H + idx * ROW_H
      // Background alternado
      ctx.fillStyle = idx % 2 === 0 ? C.rowEven : C.rowOdd
      ctx.fillRect(headerX, ry, headerW, ROW_H)

      // Borda inferior sutil
      ctx.fillStyle = C.line
      ctx.fillRect(headerX, ry + ROW_H - 1, headerW, 1)

      let x = headerX + 20

      // VEÍCULO (com badge de severidade)
      const sevColor = item.imperativo ? C.rose : C.amber
      ctx.fillStyle = sevColor
      ctx.beginPath()
      ctx.arc(x + 5, ry + ROW_H / 2, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = C.ink
      ctx.font = `800 13px ${FONT}`
      const veiculoTxt = truncate(ctx, item.veiculoLabel, cols[0].w - 30)
      ctx.fillText(veiculoTxt, x + 16, ry + ROW_H / 2)
      x += cols[0].w

      // DEFEITO
      ctx.fillStyle = C.ink
      ctx.font = `600 13px ${FONT}`
      const defTxt = truncate(ctx, formatDefeitoParaExibicao(item.defeito), cols[1].w - 20)
      ctx.fillText(defTxt, x, ry + ROW_H / 2)
      x += cols[1].w

      // BASE
      ctx.fillStyle = C.muted
      ctx.font = `700 12px ${FONT}`
      ctx.fillText(truncate(ctx, item.base || '—', cols[2].w - 20), x, ry + ROW_H / 2)
      x += cols[2].w

      // RESPONSÁVEL
      ctx.fillStyle = C.muted
      ctx.font = `600 12px ${FONT}`
      ctx.fillText(truncate(ctx, item.responsavel || '—', cols[3].w - 20), x, ry + ROW_H / 2)
      x += cols[3].w

      // APONTADO
      ctx.fillStyle = C.subtle
      ctx.font = `600 12px ${FONT}`
      ctx.fillText(formatBR(item.dataApontamento), x, ry + ROW_H / 2)
      x += cols[4].w

      // RESOLVIDO (em verde)
      ctx.fillStyle = C.emerald
      ctx.font = `700 12px ${FONT}`
      ctx.fillText(formatBR(item.dataResolvido), x, ry + ROW_H / 2)
      x += cols[5].w

      // TEMPO
      const tempo = daysBetween(item.dataApontamento, item.dataResolvido)
      const tempoTxt = tempo != null ? `${tempo}d` : '—'
      const tempoColor = tempo == null ? C.muted : tempo <= 3 ? C.emerald : tempo <= 7 ? C.amber : C.rose
      // Pill
      ctx.fillStyle = tempoColor + '20'
      const pillW = ctx.measureText(tempoTxt).width + 16
      roundRect(ctx, x, ry + ROW_H / 2 - 11, pillW, 22, 11)
      ctx.fill()
      ctx.fillStyle = tempoColor
      ctx.font = `900 11px ${FONT}`
      ctx.textAlign = 'center'
      ctx.fillText(tempoTxt, x + pillW / 2, ry + ROW_H / 2)
      ctx.textAlign = 'left'
      x += cols[6].w

      // CUSTO
      ctx.fillStyle = item.reparoValor ? C.amber : C.subtle
      ctx.font = `800 12px ${FONT}`
      ctx.fillText(formatCurrency(item.reparoValor), x, ry + ROW_H / 2)
    })
  }

  // ─── Footer ──────────────────────────────────────────────────────────────
  const footerY = totalH - PAD - FOOTER_H
  ctx.fillStyle = C.line
  ctx.fillRect(headerX, footerY, headerW, 1)

  ctx.fillStyle = C.muted
  ctx.font = `600 12px ${FONT}`
  ctx.fillText(`${items.length} ${items.length === 1 ? 'defeito resolvido' : 'defeitos resolvidos'}`, headerX, footerY + 30)

  ctx.fillStyle = C.subtle
  ctx.font = `600 11px ${FONT}`
  ctx.textAlign = 'right'
  ctx.fillText('CGB Engenharia · Frota Goman', headerX + headerW, footerY + 30)
  ctx.textAlign = 'left'

  return canvas.toDataURL('image/png')
}

export function downloadResolvidosScreenshot(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
