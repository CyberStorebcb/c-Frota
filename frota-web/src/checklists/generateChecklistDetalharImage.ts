import type {
  ChecklistDetalharPdfScope,
  ChecklistDetalharVeiculoRow,
  ChecklistDetalharChecklistRow,
  ChecklistDetalharPdfMeta,
} from './generateChecklistDetalharPdf'

export type ChecklistDetalharImageScope = ChecklistDetalharPdfScope | 'justificados' | 'tudo'

export type ChecklistDetalharJustificadoRow = {
  placa: string
  modelo: string
  base: string
  prefixo: string
  supervisor: string
  coordenador: string
  motivo: string
  placaReserva?: string
}

// ── constants ──────────────────────────────────────────────────────────────

const FF = '"Segoe UI", Inter, system-ui, -apple-system, sans-serif'
const W = 1920
const PAD = 48
const ROW_H = 42
const COL_H = 38
const TITLE_H = 54
const HEADER_H = 136
const GAP = 28

type Ctx = CanvasRenderingContext2D

// ── helpers ────────────────────────────────────────────────────────────────

function sf(ctx: Ctx, size: number, weight: number | string = 700) {
  ctx.font = `${weight} ${size}px ${FF}`
}

function clip(ctx: Ctx, text: string, maxW: number): string {
  if (!text || text === '—') return text || '—'
  if (ctx.measureText(text).width <= maxW) return text
  let s = text
  while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1)
  return s + '…'
}

function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const m = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + m, y)
  ctx.lineTo(x + w - m, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + m)
  ctx.lineTo(x + w, y + h - m)
  ctx.quadraticCurveTo(x + w, y + h, x + w - m, y + h)
  ctx.lineTo(x + m, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - m)
  ctx.lineTo(x, y + m)
  ctx.quadraticCurveTo(x, y, x + m, y)
  ctx.closePath()
}

function rrectTop(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const m = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + m, y)
  ctx.lineTo(x + w - m, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + m)
  ctx.lineTo(x + w, y + h)
  ctx.lineTo(x, y + h)
  ctx.lineTo(x, y + m)
  ctx.quadraticCurveTo(x, y, x + m, y)
  ctx.closePath()
}

// ── top header ─────────────────────────────────────────────────────────────

function drawTopHeader(ctx: Ctx, x: number, y: number, w: number, h: number, meta: ChecklistDetalharPdfMeta) {
  rrect(ctx, x, y, w, h, 20)
  ctx.fillStyle = 'rgba(15,23,42,0.97)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // left accent stripe
  ctx.fillStyle = '#3b82f6'
  ctx.fillRect(x, y + 24, 4, h - 48)

  // subtitle
  sf(ctx, 13, 800)
  ctx.fillStyle = '#60a5fa'
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  ctx.fillText('CGB ENERGIA · CONTROLE DE FROTA', x + 28, y + 24)

  // main title
  sf(ctx, 36, 800)
  ctx.fillStyle = '#f8fafc'
  ctx.fillText('RESULTADOS DO CHECKLIST', x + 28, y + 46)

  // meta line
  sf(ctx, 16, 600)
  ctx.fillStyle = '#94a3b8'
  const parts = [meta.periodoLabel, meta.periodoResumo, meta.setorLabel].filter(Boolean)
  ctx.fillText(parts.join(' · '), x + 28, y + 94)

  // right: timestamp + busca
  ctx.textAlign = 'right'
  sf(ctx, 13, 500)
  ctx.fillStyle = '#475569'
  ctx.fillText(`Gerado em ${new Date().toLocaleString('pt-BR')}`, x + w - 28, y + 30)
  if (meta.busca) {
    sf(ctx, 12, 600)
    ctx.fillStyle = '#f59e0b'
    ctx.fillText(`Busca: "${meta.busca}"`, x + w - 28, y + 52)
  }
  ctx.textAlign = 'left'
}

// ── table section ──────────────────────────────────────────────────────────

type ColDef<T> = {
  header: string
  w: number | 'flex'
  text: (row: T, i: number) => string
  align?: 'left' | 'center'
}

function resolveWidths<T>(cols: ColDef<T>[], total: number): number[] {
  const fixed = cols.reduce<number>((s, c) => s + (c.w === 'flex' ? 0 : (c.w as number)), 0)
  const flex = Math.max(60, total - fixed)
  return cols.map(c => (c.w === 'flex' ? flex : (c.w as number)))
}

function sectionH(rowCount: number): number {
  return TITLE_H + COL_H + rowCount * ROW_H + 28
}

function drawSection<T>(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  title: string,
  variant: 'nao' | 'sim' | 'justificados',
  cols: ColDef<T>[],
  rows: T[],
): void {
  const h = sectionH(rows.length)
  const isNao = variant === 'nao'
  const isJust = variant === 'justificados'
  const accent = isNao ? '#f43f5e' : isJust ? '#f59e0b' : '#10b981'
  const titleBg = isNao ? 'rgba(76,5,25,0.75)' : isJust ? 'rgba(78,52,6,0.75)' : 'rgba(6,78,59,0.65)'
  const border = isNao ? 'rgba(244,63,94,0.4)' : isJust ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.4)'
  const titleFg = isNao ? '#fda4af' : isJust ? '#fcd34d' : '#6ee7b7'
  const rowAccent = isNao ? 'rgba(244,63,94,0.05)' : isJust ? 'rgba(245,158,11,0.05)' : 'rgba(16,185,129,0.05)'
  const colHdrFg = isNao ? '#fca5a5' : isJust ? '#fde68a' : '#86efac'
  const widths = resolveWidths(cols, w)

  // card
  rrect(ctx, x, y, w, h, 20)
  ctx.fillStyle = 'rgba(15,23,42,0.96)'
  ctx.fill()
  ctx.strokeStyle = border
  ctx.lineWidth = 1.5
  ctx.stroke()

  // title bar
  rrectTop(ctx, x, y, w, TITLE_H, 20)
  ctx.fillStyle = titleBg
  ctx.fill()

  sf(ctx, 17, 800)
  ctx.fillStyle = titleFg
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillText(title, x + 24, y + TITLE_H / 2)

  // count badge
  const cnt = String(rows.length)
  sf(ctx, 13, 800)
  const bW = Math.max(36, ctx.measureText(cnt).width + 20)
  const bH = 26
  const bX = x + w - bW - 20
  const bY = y + (TITLE_H - bH) / 2
  rrect(ctx, bX, bY, bW, bH, bH / 2)
  ctx.fillStyle = isNao ? 'rgba(244,63,94,0.22)' : 'rgba(16,185,129,0.22)'
  ctx.fill()
  ctx.fillStyle = titleFg
  ctx.textAlign = 'center'
  ctx.fillText(cnt, bX + bW / 2, bY + bH / 2)
  ctx.textAlign = 'left'

  // column headers
  let cy = y + TITLE_H
  ctx.fillStyle = 'rgba(30,41,59,0.9)'
  ctx.fillRect(x, cy, w, COL_H)
  ctx.fillStyle = accent + '88'
  ctx.fillRect(x, cy + COL_H - 1, w, 1)

  let cx = x
  for (let i = 0; i < cols.length; i++) {
    const cw = widths[i]!
    sf(ctx, 10, 800)
    ctx.fillStyle = colHdrFg
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillText(cols[i]!.header.toUpperCase(), cx + 12, cy + COL_H / 2)
    cx += cw
  }
  cy += COL_H

  // data rows
  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri]!

    if (ri % 2 === 0) {
      ctx.fillStyle = rowAccent
      ctx.fillRect(x, cy, w, ROW_H)
    }

    // separator
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, cy + ROW_H)
    ctx.lineTo(x + w, cy + ROW_H)
    ctx.stroke()

    cx = x
    for (let ci = 0; ci < cols.length; ci++) {
      const col = cols[ci]!
      const cw = widths[ci]!
      const pad = 12
      const val = col.text(row, ri) || '—'
      const align = col.align ?? 'left'
      const isNum = ci === 0
      const isPlaca = ci === 1

      sf(ctx, 13, isPlaca ? 700 : 400)
      ctx.fillStyle = isNum ? '#475569' : isPlaca ? '#f1f5f9' : '#cbd5e1'
      ctx.textBaseline = 'middle'

      if (align === 'center') {
        ctx.textAlign = 'center'
        ctx.fillText(clip(ctx, val, cw - pad * 2), cx + cw / 2, cy + ROW_H / 2)
      } else {
        ctx.textAlign = 'left'
        ctx.fillText(clip(ctx, val, cw - pad * 2), cx + pad, cy + ROW_H / 2)
      }

      cx += cw
    }

    cy += ROW_H
  }

  ctx.textAlign = 'left'
}

// ── public API ─────────────────────────────────────────────────────────────

export function generateChecklistDetalharImage(
  scope: ChecklistDetalharImageScope,
  meta: ChecklistDetalharPdfMeta,
  naoRows: ChecklistDetalharVeiculoRow[],
  simRows: ChecklistDetalharChecklistRow[],
  justRows: ChecklistDetalharJustificadoRow[],
): string {
  const cw = W - PAD * 2
  const showNao  = scope === 'nao'  || scope === 'ambos' || scope === 'tudo'
  const showSim  = scope === 'sim'  || scope === 'ambos' || scope === 'tudo'
  const showJust = scope === 'justificados' || scope === 'tudo'

  const naoH  = showNao  ? sectionH(naoRows.length)  : 0
  const simH  = showSim  ? sectionH(simRows.length)  : 0
  const justH = showJust ? sectionH(justRows.length) : 0

  const sections = [showNao && naoH, showSim && simH, showJust && justH].filter(Boolean) as number[]
  const totalSections = sections.reduce((s, h) => s + h + GAP, 0) - GAP

  const H = PAD + HEADER_H + GAP + totalSections + PAD

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // background gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#020617')
  bg.addColorStop(1, '#0a0f1e')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  drawTopHeader(ctx, PAD, PAD, cw, HEADER_H, meta)

  let curY = PAD + HEADER_H + GAP

  const naoCols: ColDef<ChecklistDetalharVeiculoRow>[] = [
    { header: 'Nº', w: 52, text: (_, i) => String(i + 1), align: 'center' },
    { header: 'Placa', w: 130, text: r => r.placa },
    { header: 'Base', w: 110, text: r => r.base || '—' },
    { header: 'Modelo', w: 200, text: r => r.modelo || '—' },
    { header: 'Prefixo', w: 190, text: r => r.prefixo || '—' },
    { header: 'Supervisor', w: 'flex', text: r => r.supervisor || '—' },
    { header: 'Gerência', w: 240, text: r => r.coordenador || '—' },
  ]

  const simCols: ColDef<ChecklistDetalharChecklistRow>[] = [
    { header: 'Nº', w: 52, text: (_, i) => String(i + 1), align: 'center' },
    { header: 'Placa', w: 130, text: r => r.placa },
    { header: 'Base', w: 110, text: r => r.base || '—' },
    { header: 'Modelo', w: 200, text: r => r.modelo || '—' },
    { header: 'Prefixo', w: 190, text: r => r.prefixo || '—' },
    { header: 'Hora', w: 90, text: r => r.hora || '—', align: 'center' },
    { header: 'NC', w: 80, text: r => (r.temNc ? 'Sim' : '—'), align: 'center' },
    { header: 'Supervisor', w: 'flex', text: r => r.supervisor || '—' },
    { header: 'Gerência', w: 240, text: r => r.coordenador || '—' },
  ]

  const justCols: ColDef<ChecklistDetalharJustificadoRow>[] = [
    { header: 'Nº', w: 52, text: (_, i) => String(i + 1), align: 'center' },
    { header: 'Placa', w: 130, text: r => r.placa },
    { header: 'Base', w: 110, text: r => r.base || '—' },
    { header: 'Modelo', w: 200, text: r => r.modelo || '—' },
    { header: 'Prefixo', w: 190, text: r => r.prefixo || '—' },
    { header: 'Motivo', w: 200, text: r => r.motivo + (r.placaReserva ? ` · ${r.placaReserva}` : ''), align: 'center' },
    { header: 'Supervisor', w: 'flex', text: r => r.supervisor || '—' },
    { header: 'Gerência', w: 240, text: r => r.coordenador || '—' },
  ]

  if (showNao) {
    drawSection(ctx, PAD, curY, cw, 'NÃO REALIZARAM', 'nao', naoCols, naoRows)
    curY += naoH + GAP
  }
  if (showSim) {
    drawSection(ctx, PAD, curY, cw, 'REALIZARAM', 'sim', simCols, simRows)
    curY += simH + GAP
  }
  if (showJust) {
    drawSection(ctx, PAD, curY, cw, 'JUSTIFICADOS', 'justificados', justCols, justRows)
  }

  return canvas.toDataURL('image/png')
}

export function downloadChecklistImage(scope: ChecklistDetalharImageScope, dataUrl: string): void {
  const stamp = new Date().toISOString().slice(0, 10)
  const suffix =
    scope === 'nao'          ? 'nao-realizados'  :
    scope === 'sim'          ? 'realizados'       :
    scope === 'justificados' ? 'justificados'     :
    scope === 'tudo'         ? 'completo'         : 'ambos'
  const link = document.createElement('a')
  link.download = `checklist-detalhar-${suffix}-${stamp}.png`
  link.href = dataUrl
  link.click()
}
