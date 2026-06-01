import { OFFICIAL_COORDENADORES, OFFICIAL_SUPERVISORS } from '../data/officialFilters.gen'

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Primeiro token normalizado de cada supervisor e coordenador. */
const FIRST_NAMES: Set<string> = new Set([
  ...OFFICIAL_COORDENADORES.map((n) => norm(n.split(' ')[0]!)),
  ...OFFICIAL_SUPERVISORS.map((n) => norm(n.split(' ')[0]!)),
])

/**
 * Retorna true se o email pertence a um supervisor ou coordenador autorizado.
 * Extrai o primeiro segmento do local do email (antes do primeiro ponto ou @)
 * e compara com os nomes das listas oficiais de filtros.
 *
 * Ex: "julio.santos@cgbengenharia.com.br" → "julio" → coordenador JÚLIO ✓
 *     "edivan.lima@cgbengenharia.com.br"  → "edivan" → supervisor EDIVAN DE LIMA ✓
 */
export function canJustifyByEmail(email: string): boolean {
  const local = email.split('@')[0] ?? ''
  const firstName = norm(local.split('.')[0] ?? local)
  return FIRST_NAMES.has(firstName)
}
