import { downloadDataUrl } from './generateRankingScreenshot'

export type SummaryScreenshotInput = {
  titulo: string
  periodoLabel: string
  periodoResumo: string
  diasNoPeriodo: number
  filtrosAtivos?: string
  ativos: number
  realizaram: number
  naoRealizaram: number
  justificados: number
  aderenciaPct: number
  aderenciaRealizado: number
  aderenciaEsperado: number
  setorLabel: string
}

const SCALE = 1
const W = 960
const FONT = '"Segoe UI", Inter, system-ui, -apple-system, sans-serif'

type Ctx = CanvasRenderingContext2D

function setFont(ctx: Ctx, size: number, weight: string | number = 700) {
  ctx.font = `${weight} ${size}px ${FONT}`
}

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

function fillRR(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string) {
  roundRect(ctx, x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()
}

function strokeRR(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, stroke: string, lw = 1.5) {
  roundRect(ctx, x, y, w, h, r)
  ctx.strokeStyle = stroke
  ctx.lineWidth = lw
  ctx.stroke()
}

function drawCard(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string | number,
  sub: string,
  accentColor: string,
  bgColor: string,
  borderColor: string,
  textColor: string,
) {
  fillRR(ctx, x, y, w, h, 18, bgColor)
  strokeRR(ctx, x, y, w, h, 18, borderColor)
  // barra lateral
  fillRR(ctx, x, y + 12, 5, h - 24, 3, accentColor)

  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  setFont(ctx, 11, 800)
  ctx.fillStyle = textColor + 'bb'
  ctx.fillText(label.toUpperCase(), x + 20, y + 18)

  setFont(ctx, 40, 900)
  ctx.fillStyle = textColor
  ctx.fillText(String(value), x + 20, y + 36)

  setFont(ctx, 12, 600)
  ctx.fillStyle = textColor + '99'
  ctx.fillText(sub, x + 20, y + 84)
}

export function generateSummaryScreenshot(input: SummaryScreenshotInput): string {
  const PAD = 40
  const CARD_H = 110
  const CARD_GAP = 12
  const CARD_W = (W - PAD * 2 - CARD_GAP * 3) / 4

  const headerH = input.filtrosAtivos ? 148 : 120
  const adH = 80
  const H = PAD + headerH + PAD + CARD_H + PAD + adH + PAD

  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)

  // fundo
  ctx.fillStyle = '#0b1120'
  ctx.fillRect(0, 0, W, H)

  // ── header ───────────────────────────────────────────────────────────────
  fillRR(ctx, PAD, PAD, W - PAD * 2, headerH, 20, 'rgba(255,255,255,0.04)')
  strokeRR(ctx, PAD, PAD, W - PAD * 2, headerH, 20, 'rgba(255,255,255,0.10)')

  // badge Checklist
  const badgeW = 130
  fillRR(ctx, PAD + 20, PAD + 16, badgeW, 22, 11, 'rgba(167,139,250,0.18)')
  setFont(ctx, 10, 800)
  ctx.fillStyle = '#a78bfa'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.fillText(input.titulo.toUpperCase(), PAD + 20 + badgeW / 2, PAD + 16 + 11)

  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  setFont(ctx, 28, 900)
  ctx.fillStyle = '#f8fafc'
  ctx.fillText('Detalhar Checklists', PAD + 20, PAD + 44)

  setFont(ctx, 14, 600)
  ctx.fillStyle = '#64748b'
  ctx.fillText(`${input.periodoLabel} · ${input.periodoResumo} · ${input.diasNoPeriodo} dia(s) · ${input.setorLabel}`, PAD + 20, PAD + 80)

  if (input.filtrosAtivos) {
    setFont(ctx, 13, 700)
    const pillText = `Filtro: ${input.filtrosAtivos}`
    const pillW = ctx.measureText(pillText).width + 24
    const pillX = PAD + 20
    const pillY = PAD + 104
    fillRR(ctx, pillX, pillY, pillW, 26, 13, 'rgba(251,191,36,0.15)')
    strokeRR(ctx, pillX, pillY, pillW, 26, 13, 'rgba(251,191,36,0.45)')
    ctx.fillStyle = '#fcd34d'
    ctx.textBaseline = 'middle'
    ctx.fillText(pillText, pillX + 12, pillY + 13)
    ctx.textBaseline = 'top'
  }

  // data/hora geração
  ctx.textAlign = 'right'
  setFont(ctx, 12, 600)
  ctx.fillStyle = '#475569'
  ctx.fillText(`Gerado em ${new Date().toLocaleString('pt-BR')}`, W - PAD - 20, PAD + 20)
  ctx.textAlign = 'left'

  // ── 4 cards ───────────────────────────────────────────────────────────────
  const cardsY = PAD + headerH + PAD

  const cards = [
    {
      label: 'Veículos ativos',
      value: input.ativos,
      sub: input.setorLabel,
      accent: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.25)', text: '#c4b5fd',
    },
    {
      label: 'Realizaram',
      value: input.realizaram,
      sub: 'checklists concluídos',
      accent: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', text: '#6ee7b7',
    },
    {
      label: 'Não realizaram',
      value: input.naoRealizaram,
      sub: 'pendentes no período',
      accent: '#f43f5e', bg: 'rgba(244,63,94,0.08)', border: 'rgba(244,63,94,0.25)', text: '#fda4af',
    },
    {
      label: 'Justificados',
      value: input.justificados,
      sub: 'com justificativa válida',
      accent: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', text: '#fcd34d',
    },
  ]

  cards.forEach((card, i) => {
    const cx = PAD + i * (CARD_W + CARD_GAP)
    drawCard(ctx, cx, cardsY, CARD_W, CARD_H, card.label, card.value, card.sub, card.accent, card.bg, card.border, card.text)
  })

  // ── aderência ─────────────────────────────────────────────────────────────
  const adY = cardsY + CARD_H + PAD
  const pct = input.aderenciaPct
  const adColor = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#f43f5e'
  const adBg   = pct >= 80 ? 'rgba(16,185,129,0.08)' : pct >= 50 ? 'rgba(245,158,11,0.08)' : 'rgba(244,63,94,0.08)'
  const adBorder = pct >= 80 ? 'rgba(16,185,129,0.25)' : pct >= 50 ? 'rgba(245,158,11,0.25)' : 'rgba(244,63,94,0.25)'

  fillRR(ctx, PAD, adY, W - PAD * 2, adH, 18, adBg)
  strokeRR(ctx, PAD, adY, W - PAD * 2, adH, 18, adBorder)
  fillRR(ctx, PAD, adY + 10, 5, adH - 20, 3, adColor)

  setFont(ctx, 11, 800)
  ctx.fillStyle = adColor + 'bb'
  ctx.textBaseline = 'top'
  ctx.fillText('ADERÊNCIA' + (input.diasNoPeriodo === 1 ? ' HOJE' : ' NO PERÍODO'), PAD + 20, adY + 14)

  setFont(ctx, 13, 600)
  ctx.fillStyle = '#94a3b8'
  ctx.fillText(
    `${input.aderenciaRealizado} de ${input.aderenciaEsperado} com aderência (realizados + justificados)`,
    PAD + 20,
    adY + 34,
  )

  // barra de progresso
  const barX = PAD + 20
  const barY = adY + 56
  const barW = W - PAD * 2 - 120
  const barH2 = 12
  fillRR(ctx, barX, barY, barW, barH2, barH2 / 2, '#1e293b')
  const fillW = Math.max(barH2, (barW * Math.min(100, pct)) / 100)
  fillRR(ctx, barX, barY, fillW, barH2, barH2 / 2, adColor)

  // percentual
  ctx.textAlign = 'right'
  setFont(ctx, 28, 900)
  ctx.fillStyle = adColor
  ctx.textBaseline = 'top'
  ctx.fillText(`${pct}%`, W - PAD - 20, adY + 20)
  ctx.textAlign = 'left'

  return canvas.toDataURL('image/png')
}

export { downloadDataUrl }
