import type { ChecklistGrupo } from '../data/checklistSchemas'

export type ChecklistPublicoPdfData = {
  schemaNome: string
  operador: string
  matricula: string
  nomeSupervisor: string
  veiculo: string
  dadosVeiculo: Record<string, string>
  grupos: ChecklistGrupo[]
  respostas: Record<string, string | null>
  observacoes: Record<string, string>
  submittedAt: Date
  offline: boolean
}

const COR_PRIMARIA: [number, number, number] = [30, 41, 98]   // azul CGB
const COR_VERDE:   [number, number, number] = [22, 163, 74]
const COR_VERMELHO:[number, number, number] = [220, 38, 38]
const COR_CINZA:   [number, number, number] = [100, 116, 139]
const COR_AMARELO: [number, number, number] = [217, 119, 6]

function fmtDate(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtTime(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const CAMPO_LABELS: Record<string, string> = {
  placa: 'Placa',
  marca_modelo: 'Marca/Modelo',
  km_atual: 'KM Atual',
  localidade: 'Localidade',
  prefixo: 'Prefixo',
  base: 'Base',
  tipo_operacao: 'Tipo de Operação',
}

export async function generateChecklistPublicoPdf(raw: ChecklistPublicoPdfData): Promise<void> {
  // Normaliza campos que podem chegar undefined por compatibilidade de versão
  const data: ChecklistPublicoPdfData = {
    schemaNome:     raw.schemaNome     ?? 'Checklist',
    operador:       raw.operador       ?? '',
    matricula:      raw.matricula      ?? '',
    nomeSupervisor: raw.nomeSupervisor ?? '',
    veiculo:        raw.veiculo        ?? '',
    dadosVeiculo:   raw.dadosVeiculo   ?? {},
    grupos:         raw.grupos         ?? [],
    respostas:      raw.respostas      ?? {},
    observacoes:    raw.observacoes    ?? {},
    submittedAt:    raw.submittedAt    ?? new Date(),
    offline:        raw.offline        ?? false,
  }

  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 14
  const contentW = pageW - margin * 2
  let y = margin

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin - 8) {
      doc.addPage()
      drawPageHeader()
      y = margin + 18
    }
  }

  // ── Rodapé em cada página ─────────────────────────────────────────────────
  const drawFooter = (pageNum: number, totalPages: number) => {
    const py = pageH - 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...COR_CINZA)
    doc.text(
      `${data.offline ? 'Salvo offline' : 'Enviado'} em ${fmtDate(data.submittedAt)} às ${fmtTime(data.submittedAt)}`,
      margin,
      py,
    )
    doc.text(`Página ${pageNum} / ${totalPages}`, pageW - margin, py, { align: 'right' })
  }

  // ── Cabeçalho de página (exceto o primeiro) ───────────────────────────────
  const drawPageHeader = () => {
    doc.setFillColor(...COR_PRIMARIA)
    doc.rect(margin, margin, contentW, 10, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    doc.text(`CGB FROTA  ·  ${data.schemaNome.toUpperCase()}  ·  ${data.veiculo}`, margin + 3, margin + 6.5)
  }

  // ── Cabeçalho principal (página 1) ────────────────────────────────────────
  doc.setFillColor(...COR_PRIMARIA)
  doc.rect(0, 0, pageW, 28, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text('CGB FROTA', margin, 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(180, 200, 255)
  doc.text('Relatório de Inspeção de Veículo', margin, 19)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text(data.schemaNome.toUpperCase(), pageW - margin, 12, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(180, 200, 255)
  doc.text(
    `${fmtDate(data.submittedAt)}  ·  ${fmtTime(data.submittedAt)}`,
    pageW - margin,
    19,
    { align: 'right' },
  )

  y = 36

  // ── Seção: informações gerais ─────────────────────────────────────────────
  const drawSectionTitle = (title: string) => {
    ensureSpace(14)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...COR_PRIMARIA)
    doc.text(title.toUpperCase(), margin, y)
    doc.setDrawColor(...COR_PRIMARIA)
    doc.setLineWidth(0.4)
    doc.line(margin, y + 1.5, pageW - margin, y + 1.5)
    y += 7
  }

  const drawInfoRow = (label: string, value: string, halfWidth = false, offsetX = 0) => {
    const colW = halfWidth ? contentW / 2 : contentW
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...COR_CINZA)
    doc.text(label.toUpperCase(), margin + offsetX, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(30, 30, 30)
    doc.text(value || '—', margin + offsetX, y + 5, { maxWidth: colW - 4 })
    return y + 13
  }

  drawSectionTitle('Identificação')

  // Linha 1: Operador + Matrícula
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...COR_CINZA)
  doc.text('OPERADOR', margin, y)
  doc.text('MATRÍCULA', margin + contentW / 2, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(30, 30, 30)
  doc.text(data.operador || '—', margin, y + 5)
  doc.text(data.matricula || '—', margin + contentW / 2, y + 5)
  y += 13

  // Linha 2: Supervisor
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...COR_CINZA)
  doc.text('SUPERVISOR', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(30, 30, 30)
  doc.text(data.nomeSupervisor || '—', margin, y + 5)
  y += 13

  // ── Seção: dados do veículo ───────────────────────────────────────────────
  drawSectionTitle('Dados do Veículo')

  const camposOrdem = ['placa', 'marca_modelo', 'km_atual', 'localidade', 'prefixo', 'base', 'tipo_operacao']
  const camposExibir = camposOrdem.filter((k) => data.dadosVeiculo[k])

  // Pares lado-a-lado
  for (let i = 0; i < camposExibir.length; i += 2) {
    ensureSpace(14)
    const k1 = camposExibir[i]!
    const k2 = camposExibir[i + 1]
    const label1 = CAMPO_LABELS[k1] ?? k1
    const label2 = k2 ? (CAMPO_LABELS[k2] ?? k2) : ''
    const val1 = data.dadosVeiculo[k1] ?? '—'
    const val2 = k2 ? (data.dadosVeiculo[k2] ?? '—') : ''

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...COR_CINZA)
    doc.text(label1.toUpperCase(), margin, y)
    if (label2) doc.text(label2.toUpperCase(), margin + contentW / 2, y)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(30, 30, 30)
    doc.text(val1, margin, y + 5, { maxWidth: contentW / 2 - 4 })
    if (val2) doc.text(val2, margin + contentW / 2, y + 5, { maxWidth: contentW / 2 - 4 })
    y += 13
  }

  // ── Seção: itens de inspeção ──────────────────────────────────────────────
  drawSectionTitle('Itens de Inspeção')

  const badgeW = 10
  const badgeH = 5.5
  const itemH  = 8

  const drawBadge = (status: string | null, bx: number, by: number) => {
    if (status === 'c') {
      doc.setFillColor(...COR_VERDE)
      doc.roundedRect(bx, by - 4, badgeW, badgeH, 1, 1, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.5)
      doc.setTextColor(255, 255, 255)
      doc.text('C', bx + badgeW / 2, by - 0.5, { align: 'center' })
    } else if (status === 'nc') {
      doc.setFillColor(...COR_VERMELHO)
      doc.roundedRect(bx, by - 4, badgeW, badgeH, 1, 1, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.5)
      doc.setTextColor(255, 255, 255)
      doc.text('NC', bx + badgeW / 2, by - 0.5, { align: 'center' })
    } else if (status === 'na') {
      doc.setFillColor(226, 232, 240)
      doc.roundedRect(bx, by - 4, badgeW, badgeH, 1, 1, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.5)
      doc.setTextColor(...COR_CINZA)
      doc.text('N/A', bx + badgeW / 2, by - 0.5, { align: 'center' })
    } else {
      doc.setFillColor(241, 245, 249)
      doc.roundedRect(bx, by - 4, badgeW, badgeH, 1, 1, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6)
      doc.setTextColor(...COR_CINZA)
      doc.text('—', bx + badgeW / 2, by - 0.5, { align: 'center' })
    }
  }

  for (const grupo of data.grupos) {
    // Título do grupo
    ensureSpace(12)
    doc.setFillColor(241, 245, 249)
    doc.rect(margin, y - 5.5, contentW, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...COR_PRIMARIA)
    doc.text(grupo.titulo, margin + 2, y)
    y += 6

    for (let idx = 0; idx < grupo.itens.length; idx++) {
      const item = grupo.itens[idx]!
      const status = data.respostas[item.id] ?? null
      const obs    = data.observacoes[item.id] ?? ''
      const hasObs = status === 'nc' && obs.trim()

      const needed = hasObs ? itemH + 7 : itemH
      ensureSpace(needed)

      // Zebra
      if (idx % 2 === 0) {
        doc.setFillColor(250, 252, 255)
        doc.rect(margin, y - 5, contentW, needed, 'F')
      }

      // Imperativo badge
      if (item.imperativo) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6)
        doc.setTextColor(...COR_VERMELHO)
        doc.text('🚫', margin + 2, y - 1)
      }

      // Label do item
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(status === 'nc' ? 180 : 50, status === 'nc' ? 30 : 50, status === 'nc' ? 30 : 50)
      const labelX = item.imperativo ? margin + 6 : margin + 2
      doc.text(item.label, labelX, y - 1, { maxWidth: contentW - badgeW - 10 })

      // Badge de status
      drawBadge(status, pageW - margin - badgeW - 2, y)

      // Observação NC
      if (hasObs) {
        y += 5
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(7)
        doc.setTextColor(...COR_AMARELO)
        const obsText = doc.splitTextToSize(`Obs: ${obs}`, contentW - 8)
        doc.text(obsText, margin + 4, y)
        y += obsText.length * 4
      } else {
        y += itemH
      }
    }

    y += 3
  }

  // ── Seção: resumo de NCs ──────────────────────────────────────────────────
  const ncItens = data.grupos.flatMap((g) =>
    g.itens
      .filter((it) => data.respostas[it.id] === 'nc')
      .map((it) => ({ ...it, obs: data.observacoes[it.id] ?? '' })),
  )

  if (ncItens.length > 0) {
    ensureSpace(20)
    drawSectionTitle(`Não Conformidades (${ncItens.length})`)

    for (const item of ncItens) {
      ensureSpace(16)
      doc.setFillColor(255, 241, 242)
      doc.rect(margin, y - 5.5, contentW, item.obs ? 14 : 8, 'F')
      doc.setDrawColor(...COR_VERMELHO)
      doc.setLineWidth(0.6)
      doc.line(margin, y - 5.5, margin, y + (item.obs ? 8.5 : 2.5))
      doc.setLineWidth(0.2)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...COR_VERMELHO)
      doc.text(`${item.imperativo ? '🚫 ' : '⚠ '}${item.label}`, margin + 3, y - 1)

      if (item.obs) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(7.5)
        doc.setTextColor(100, 40, 40)
        const obsLines = doc.splitTextToSize(item.obs, contentW - 8)
        doc.text(obsLines, margin + 3, y + 5)
        y += 5 + obsLines.length * 4 + 4
      } else {
        y += 10
      }
    }
  }

  // ── Finaliza — adiciona rodapés em todas as páginas ───────────────────────
  const totalPages = (doc.internal as unknown as { pages: unknown[] }).pages.length - 1 || 1
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    drawFooter(p, totalPages)
  }

  const stamp = data.submittedAt.toISOString().slice(0, 10)
  const placa = (data.dadosVeiculo['placa'] ?? data.veiculo).replace(/\s/g, '').toUpperCase()
  doc.save(`checklist-${placa}-${stamp}.pdf`)
}
