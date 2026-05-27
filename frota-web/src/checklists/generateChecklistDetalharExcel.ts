import * as XLSX from 'xlsx'

import type {
  ChecklistDetalharChecklistRow,
  ChecklistDetalharPdfMeta,
  ChecklistDetalharPdfScope,
  ChecklistDetalharVeiculoRow,
} from './generateChecklistDetalharPdf'

function buildFilename(scope: ChecklistDetalharPdfScope, setorSlug: string): string {
  const stamp = new Date().toISOString().slice(0, 10)
  const suffix =
    scope === 'nao' ? 'nao-realizados' : scope === 'sim' ? 'realizados' : 'completo'
  return `checklist-detalhar-${setorSlug}-${suffix}-${stamp}.xlsx`
}

function buildNaoRows(rows: ChecklistDetalharVeiculoRow[], multiDia: boolean): string[][] {
  const headers = [
    'Placa',
    'Base',
    'Modelo',
    'Prefixo',
    ...(multiDia ? ['Dias no período'] : []),
    'Supervisor',
    'Gerência',
  ]
  const data = rows.map((r) => [
    r.placa,
    r.base || '—',
    r.modelo || '—',
    r.prefixo || '—',
    ...(multiDia ? [`0/${r.diasNoPeriodo ?? '—'}`] : []),
    r.supervisor || '—',
    r.coordenador || '—',
  ])
  return [headers, ...data]
}

function buildSimRows(rows: ChecklistDetalharChecklistRow[], multiDia: boolean): string[][] {
  const headers = [
    'Placa',
    'Base',
    'Modelo',
    'Prefixo',
    'Data',
    'Hora',
    ...(multiDia ? ['Dias no período'] : []),
    'NC',
    'Supervisor',
    'Gerência',
  ]
  const data = rows.map((r) => [
    r.placa,
    r.base || '—',
    r.modelo || '—',
    r.prefixo || '—',
    r.dataFormatada || '—',
    r.hora || '—',
    ...(multiDia ? [`${r.diasRealizados ?? '—'}/${r.diasNoPeriodo ?? '—'}`] : []),
    r.temNc ? 'Sim' : '—',
    r.supervisor || '—',
    r.coordenador || '—',
  ])
  return [headers, ...data]
}

function appendMetaSheet(
  wb: XLSX.WorkBook,
  scope: ChecklistDetalharPdfScope,
  meta: ChecklistDetalharPdfMeta,
) {
  const scopeLabel =
    scope === 'nao'
      ? 'Somente não realizados'
      : scope === 'sim'
        ? 'Somente realizados'
        : 'Não realizados e realizados'
  const geradoEm = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const rows: string[][] = [
    ['Campo', 'Valor'],
    ['Período', `${meta.periodoLabel} (${meta.periodoResumo})`],
    ['Setor', meta.setorLabel ?? '—'],
    ['Conteúdo', scopeLabel],
    ['Gerado em', geradoEm],
  ]
  if (meta.busca?.trim()) rows.push(['Busca', meta.busca.trim()])
  const ws = XLSX.utils.aoa_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Resumo')
}

export function generateChecklistDetalharExcel(
  scope: ChecklistDetalharPdfScope,
  meta: ChecklistDetalharPdfMeta,
  naoRealizados: ChecklistDetalharVeiculoRow[],
  realizados: ChecklistDetalharChecklistRow[],
): void {
  const includeNao = scope === 'nao' || scope === 'ambos'
  const includeSim = scope === 'sim' || scope === 'ambos'

  if (includeNao && naoRealizados.length === 0 && !includeSim) {
    throw new Error('Não há checklists não realizados para exportar.')
  }
  if (includeSim && realizados.length === 0 && !includeNao) {
    throw new Error('Não há checklists realizados para exportar.')
  }
  if (includeNao && includeSim && naoRealizados.length === 0 && realizados.length === 0) {
    throw new Error('Não há registros para exportar.')
  }

  const multiDia =
    (realizados[0]?.diasNoPeriodo ?? naoRealizados[0]?.diasNoPeriodo ?? 0) > 1
  const setorSlug = (meta.setorLabel ?? 'frota')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '') || 'frota'

  const wb = XLSX.utils.book_new()

  if (includeNao && naoRealizados.length > 0) {
    const ws = XLSX.utils.aoa_to_sheet(buildNaoRows(naoRealizados, multiDia))
    XLSX.utils.book_append_sheet(wb, ws, 'Não realizaram')
  }

  if (includeSim && realizados.length > 0) {
    const ws = XLSX.utils.aoa_to_sheet(buildSimRows(realizados, multiDia))
    XLSX.utils.book_append_sheet(wb, ws, 'Realizaram')
  }

  appendMetaSheet(wb, scope, meta)
  XLSX.writeFile(wb, buildFilename(scope, setorSlug))
}
