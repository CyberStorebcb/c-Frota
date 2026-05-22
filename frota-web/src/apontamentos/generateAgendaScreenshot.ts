import { formatDefeitoParaExibicao } from './defeitoExibicao'
import { formatPlaca } from '../frota/vehicleRegistry'

export type AgendaScreenshotItem = {
  id: string
  placa: string
  prefixo: string
  modelo: string
  processo: string
  base: string
  responsavel: string
  supervisor: string
  coordenador: string
  veiculoLabel: string
  defeito: string
  agendamentoData: string
  justificativa: string | null
  imperativo: boolean
}

export type AgendaSectionKind = 'vencida' | 'hoje' | 'futura'

export type AgendaScreenshotInput = {
  items: AgendaScreenshotItem[]
  geradoEm?: Date
}

const SCALE = 2
const W = 1440

const L = {
  pad: 48,
  headerH: 184,
  summaryH: 118,
  sectionGap: 26,
  cardH: 166,
  cardHExtra: 32,
  cardGap: 16,
  footerH: 54,
  radius: 26,
} as const

const FONT = '"Segoe UI", Inter, system-ui, -apple-system, sans-serif'

const C = {
  bg: '#eaf0f8',
  paper: '#ffffff',
  ink: '#0f172a',
  muted: '#64748b',
  line: '#e2e8f0',
  brand: '#17337e',
  brand2: '#2563eb',
  cyan: '#38bdf8',
  brandLight: '#eff6ff',
  vencida: '#be123c',
  vencidaBg: '#fff1f2',
  hoje: '#b45309',
  hojeBg: '#fffbeb',
  futura: '#0369a1',
  futuraBg: '#f0f9ff',
} as const

type Ctx = CanvasRenderingContext2D

function hojeLocalIso(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

function fillRoundRect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string | CanvasGradient | CanvasPattern,
) {
  roundRect(ctx, x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()
}

function strokeRoundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, stroke: string, lineWidth = 1) {
  roundRect(ctx, x, y, w, h, r)
  ctx.strokeStyle = stroke
  ctx.lineWidth = lineWidth
  ctx.stroke()
}

function withShadow(ctx: Ctx, blur: number, color = 'rgba(15, 23, 42, 0.12)', offsetY = 10) {
  ctx.shadowColor = color
  ctx.shadowBlur = blur
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = offsetY
}

function setFont(ctx: Ctx, size: number, weight: string | number = 600) {
  ctx.font = `${weight} ${size}px ${FONT}`
}

function truncateText(ctx: Ctx, text: string, maxW: number): string {
  if (!text || ctx.measureText(text).width <= maxW) return text
  let out = text
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxW) out = out.slice(0, -1)
  return `${out}…`
}

function wrapText(ctx: Ctx, text: string, maxW: number, maxLines: number): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return []
  const words = normalized.split(' ')
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= maxW) {
      line = next
      continue
    }
    if (line) lines.push(line)
    line = word
    if (lines.length === maxLines - 1) break
  }

  if (lines.length < maxLines && line) lines.push(line)
  if (lines.length === maxLines) {
    const consumed = lines.join(' ')
    if (consumed.length < normalized.length) {
      lines[lines.length - 1] = truncateText(ctx, lines[lines.length - 1]!, maxW)
    }
  }
  return lines
}

function fmtDataCurta(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR')
}

function fmtDiaSemana(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return ''
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
}

export function classifyAgendamento(agendamentoData: string, hojeIso: string): AgendaSectionKind {
  if (agendamentoData < hojeIso) return 'vencida'
  if (agendamentoData === hojeIso) return 'hoje'
  return 'futura'
}

export function groupAgendaItems(
  items: AgendaScreenshotItem[],
  hojeIso = hojeLocalIso(),
): Record<AgendaSectionKind, AgendaScreenshotItem[]> {
  const groups: Record<AgendaSectionKind, AgendaScreenshotItem[]> = {
    vencida: [],
    hoje: [],
    futura: [],
  }
  for (const item of items) {
    groups[classifyAgendamento(item.agendamentoData, hojeIso)].push(item)
  }
  for (const key of Object.keys(groups) as AgendaSectionKind[]) {
    groups[key].sort((a, b) => a.agendamentoData.localeCompare(b.agendamentoData) || a.placa.localeCompare(b.placa))
  }
  return groups
}

export function sortAgendaItems(items: AgendaScreenshotItem[]): AgendaScreenshotItem[] {
  return [...items].sort(
    (a, b) => a.agendamentoData.localeCompare(b.agendamentoData) || a.placa.localeCompare(b.placa),
  )
}

function statusMeta(kind: AgendaSectionKind) {
  switch (kind) {
    case 'vencida':
      return { label: 'Vencida', color: C.vencida, bg: C.vencidaBg }
    case 'hoje':
      return { label: 'Hoje', color: C.hoje, bg: C.hojeBg }
    case 'futura':
      return { label: 'Agendada', color: C.futura, bg: C.futuraBg }
  }
}

function measureRowHeight(item: AgendaScreenshotItem): number {
  let h = L.cardH
  if (item.justificativa?.trim()) h += L.cardHExtra
  return h
}

function measureHeight(items: AgendaScreenshotItem[]): number {
  const rowsH = items.reduce((sum, item) => sum + measureRowHeight(item), 0)
  const gapsH = Math.max(0, items.length - 1) * L.cardGap
  return L.pad + L.headerH + L.sectionGap + L.summaryH + L.sectionGap + rowsH + gapsH + L.footerH + L.pad
}

function drawBrandMark(ctx: Ctx, cx: number, cy: number, size: number) {
  ctx.save()
  const grad = ctx.createLinearGradient(cx - size, cy - size, cx + size, cy + size)
  grad.addColorStop(0, '#60a5fa')
  grad.addColorStop(1, '#1d4ed8')
  ctx.beginPath()
  ctx.arc(cx, cy, size, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = size * 0.18
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(cx - size * 0.34, cy + size * 0.02)
  ctx.lineTo(cx - size * 0.06, cy + size * 0.3)
  ctx.lineTo(cx + size * 0.36, cy - size * 0.28)
  ctx.stroke()
  ctx.restore()
}

function drawDocumentHeader(ctx: Ctx, x: number, y: number, w: number, geradoEm: Date) {
  ctx.save()
  withShadow(ctx, 24, 'rgba(15, 23, 42, 0.18)', 12)
  const grad = ctx.createLinearGradient(x, y, x + w, y + L.headerH)
  grad.addColorStop(0, '#13296d')
  grad.addColorStop(0.62, C.brand)
  grad.addColorStop(1, C.brand2)
  fillRoundRect(ctx, x, y, w, L.headerH, L.radius, grad)
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = 0.18
  ctx.fillStyle = C.cyan
  ctx.beginPath()
  ctx.arc(x + w - 120, y + 34, 164, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(x + w - 340, y + 176, 94, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  drawBrandMark(ctx, x + 58, y + 66, 30)

  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  setFont(ctx, 15, 800)
  ctx.fillStyle = '#bfdbfe'
  ctx.fillText('FROTA WEB', x + 104, y + 38)
  setFont(ctx, 42, 900)
  ctx.fillStyle = '#ffffff'
  ctx.fillText('Agenda de correções', x + 104, y + 60)
  setFont(ctx, 20, 650)
  ctx.fillStyle = '#dbeafe'
  ctx.fillText('Relatório visual para compartilhamento e acompanhamento operacional', x + 104, y + 112)

  ctx.textAlign = 'right'
  setFont(ctx, 15, 750)
  ctx.fillStyle = '#ffffff'
  ctx.fillText('USO INTERNO', x + w - 38, y + 44)
  setFont(ctx, 14, 550)
  ctx.fillStyle = '#dbeafe'
  ctx.fillText(`Emitido em ${geradoEm.toLocaleString('pt-BR')}`, x + w - 38, y + 74)
  ctx.textAlign = 'left'
}

function drawSummaryBar(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  groups: Record<AgendaSectionKind, AgendaScreenshotItem[]>,
  total: number,
) {
  const parts = [
    { label: 'Total', value: String(total), color: C.ink, bg: '#f8fafc' },
    { label: 'Vencidas', value: String(groups.vencida.length), color: C.vencida, bg: C.vencidaBg },
    { label: 'Para hoje', value: String(groups.hoje.length), color: C.hoje, bg: C.hojeBg },
    { label: 'Próximas', value: String(groups.futura.length), color: C.futura, bg: C.futuraBg },
  ]

  const gap = 16
  const cardW = (w - gap * (parts.length - 1)) / parts.length
  ctx.textBaseline = 'middle'
  parts.forEach((part, i) => {
    const px = x + i * (cardW + gap)
    ctx.save()
    withShadow(ctx, 14, 'rgba(15, 23, 42, 0.08)', 6)
    fillRoundRect(ctx, px, y, cardW, L.summaryH, 22, C.paper)
    ctx.restore()
    fillRoundRect(ctx, px + 18, y + 20, 9, L.summaryH - 40, 5, part.color)
    fillRoundRect(ctx, px + 42, y + 22, 46, 46, 14, part.bg)
    setFont(ctx, 24, 900)
    ctx.fillStyle = part.color
    ctx.textAlign = 'center'
    ctx.fillText(part.value, px + 65, y + 45)
    ctx.textAlign = 'left'
    setFont(ctx, 13, 850)
    ctx.fillStyle = C.muted
    ctx.fillText(part.label.toUpperCase(), px + 106, y + 42)
    setFont(ctx, 19, 850)
    ctx.fillStyle = C.ink
    const detail = part.label === 'Total' ? 'correções' : 'itens'
    ctx.fillText(detail, px + 106, y + 70)
  })
}

function drawStatusBadge(ctx: Ctx, x: number, y: number, w: number, kind: AgendaSectionKind) {
  const meta = statusMeta(kind)
  const badgeW = w
  const badgeH = 34
  fillRoundRect(ctx, x, y, badgeW, badgeH, 12, meta.bg)
  setFont(ctx, 14, 900)
  ctx.fillStyle = meta.color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(meta.label.toUpperCase(), x + badgeW / 2, y + badgeH / 2)
  ctx.textAlign = 'left'
}

function drawAgendaCard(
  ctx: Ctx,
  x: number,
  y: number,
  contentW: number,
  h: number,
  item: AgendaScreenshotItem,
  index: number,
  kind: AgendaSectionKind,
) {
  const meta = statusMeta(kind)
  ctx.save()
  withShadow(ctx, 18, 'rgba(15, 23, 42, 0.10)', 8)
  fillRoundRect(ctx, x, y, contentW, h, L.radius, C.paper)
  ctx.restore()
  strokeRoundRect(ctx, x, y, contentW, h, L.radius, '#dbe3ef')
  fillRoundRect(ctx, x, y, 11, h, 8, meta.color)

  const padX = 30
  const top = y + 26
  const leftX = x + padX
  const vehicleW = 250
  const dateW = 198
  const defX = leftX + vehicleW + 34
  const defW = contentW - padX * 2 - vehicleW - dateW - 74
  const dateX = x + contentW - padX - dateW

  fillRoundRect(ctx, leftX, top, 44, 44, 14, '#eef4ff')
  setFont(ctx, 18, 900)
  ctx.fillStyle = C.brand
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(index).padStart(2, '0'), leftX + 22, top + 23)

  ctx.textAlign = 'left'
  setFont(ctx, 30, 950)
  ctx.fillStyle = C.ink
  ctx.fillText(truncateText(ctx, formatPlaca(item.placa) || item.placa, vehicleW - 58), leftX + 62, top + 20)
  setFont(ctx, 15, 800)
  ctx.fillStyle = C.muted
  const prefixo = item.prefixo?.trim() || item.processo?.trim() || 'Sem prefixo'
  ctx.fillText(truncateText(ctx, `${prefixo} · ${item.modelo?.trim() || 'Modelo não informado'}`, vehicleW + 12), leftX, top + 70)
  setFont(ctx, 14, 750)
  ctx.fillStyle = C.brand
  ctx.fillText(truncateText(ctx, item.base?.trim() || 'Base não informada', vehicleW), leftX, top + 98)

  setFont(ctx, 14, 900)
  ctx.fillStyle = C.muted
  ctx.fillText('DEFEITO / OBSERVAÇÃO', defX, top + 2)
  setFont(ctx, 22, 850)
  ctx.fillStyle = C.ink
  let defeitoTxt = formatDefeitoParaExibicao(item.defeito)
  if (item.imperativo) defeitoTxt = `[IMPERATIVO] ${defeitoTxt}`
  wrapText(ctx, defeitoTxt, defW, 2).forEach((line, i) => {
    ctx.fillText(line, defX, top + 34 + i * 28)
  })

  setFont(ctx, 14, 700)
  ctx.fillStyle = C.muted
  const equipeLine = [item.responsavel?.trim(), item.coordenador?.trim()].filter(Boolean).join(' · ') || 'Responsável não informado'
  ctx.fillText(truncateText(ctx, equipeLine, defW), defX, top + 106)

  if (item.justificativa?.trim()) {
    setFont(ctx, 14, 600)
    ctx.fillStyle = C.muted
    ctx.font = `italic 600 14px ${FONT}`
    ctx.fillText(truncateText(ctx, item.justificativa.trim(), defW), defX, top + 134)
  }

  ctx.textAlign = 'right'
  setFont(ctx, 30, 950)
  ctx.fillStyle = C.ink
  ctx.fillText(fmtDataCurta(item.agendamentoData), dateX + dateW, top + 26)
  setFont(ctx, 16, 750)
  ctx.fillStyle = C.muted
  ctx.fillText(fmtDiaSemana(item.agendamentoData).toUpperCase(), dateX + dateW, top + 56)
  drawStatusBadge(ctx, dateX + 46, top + 82, dateW - 46, kind)

  ctx.textAlign = 'left'
}

function drawFooter(ctx: Ctx, x: number, y: number, w: number, total: number) {
  setFont(ctx, 11, 500)
  ctx.fillStyle = C.muted
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(`Documento gerado automaticamente pelo Frota Web · ${total} registro(s)`, x, y + L.footerH / 2)
  ctx.textAlign = 'right'
  ctx.fillText('Confidencial — uso interno CGB', x + w, y + L.footerH / 2)
  ctx.textAlign = 'left'
}

export function generateAgendaScreenshot(input: AgendaScreenshotInput): string {
  const geradoEm = input.geradoEm ?? new Date()
  const hojeIso = hojeLocalIso(geradoEm)
  const sorted = sortAgendaItems(input.items)
  const groups = groupAgendaItems(input.items, hojeIso)
  const H = measureHeight(sorted)
  const contentW = W - L.pad * 2

  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, W, H)

  fillRoundRect(ctx, L.pad - 8, L.pad - 8, contentW + 16, H - (L.pad - 8) * 2, 30, C.paper)

  let y = L.pad
  drawDocumentHeader(ctx, L.pad, y, contentW, geradoEm)
  y += L.headerH + L.sectionGap
  drawSummaryBar(ctx, L.pad, y, contentW, groups, sorted.length)
  y += L.summaryH + L.sectionGap

  sorted.forEach((item, i) => {
    const kind = classifyAgendamento(item.agendamentoData, hojeIso)
    const rowH = measureRowHeight(item)
    drawAgendaCard(ctx, L.pad, y, contentW, rowH, item, i + 1, kind)
    y += rowH + L.cardGap
  })

  drawFooter(ctx, L.pad, H - L.pad - L.footerH, contentW, sorted.length)

  return canvas.toDataURL('image/png')
}

export function downloadAgendaScreenshot(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}
