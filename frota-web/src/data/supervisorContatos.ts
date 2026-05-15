/**
 * Mapeamento de supervisor → número de WhatsApp.
 * Formato: DDI + DDD + número, apenas dígitos (sem espaços, traços ou +).
 * Fonte: tabela de supervisores fornecida em 2026-05-14.
 */
export const SUPERVISOR_WHATSAPP: Record<string, string> = {
  'ANTONIO MARCOS SALAZAR DOS REIS':         '5599984698713',  // GERE - BCB
  'ANTONIO MARCOS SANTOS ALENCAR':           '5599991055295',  // GOMAN - PDT  (lido: +55 99 9105-5295 → sem dígito 9 extra a confirmar)
  'ARLISON ROGERIO MARTINS LIMA':            '5599981296706',  // GSTC - STI
  'CRISTOPHE DANIEL DOS SANTOS MELO':        '5599991055295',  // GOMAN - ITM  (mesmo número da imagem)
  'DEILTON SOUZA RIBEIRO':                   '5599984399031',  // GSTC - BCB
  'EDIVAN DE LIMA CARVALHO':                 '5591992011146',  // GOMAN - STI
  'EVERALDO NOGUEIRA FILHO':                 '5587981781206',  // GOMAN - BCB
  'GUILHERME FONSECA DE SOUSA NOGUEIRA':     '5599984044443',  // GSTC - PDT
  'JOAO CLIMACO MEDEIROS DE AZEVEDO JUNIOR': '5598988896598',  // GOMAN - PDS
  'JOSIEL MENESES DOS SANTOS':               '5599984057032',  // GOMAN - BDC
  'LEONARDO ESTRELA ANCHIETA':               '5599984906495',  // GSTC - ITM
  'LUIS CARLOS DE SOUZA':                    '5599981304015',  // GOMAN - BCB
  'LUIS FILIPE CANTANHEDE ALVES':            '5599988556590',  // GERE - BCB
  'MESSIAS ABREU DOS SANTOS':                '5599984912135',  // GOMAN - PDS
  'MIKEIAS VELOSO PINHEIRO':                 '5599991113667',  // GOMAN - BCB
  'PABLO SILVA LOURA':                       '5599984908650',  // GOMAN - BCB
  'RAIMUNDO HERMESSON BRITO VIEIRA DA SILVA':'5599985094768',  // GSTC - PDS
  'RAIMUNDO NONATO ALMEIDA DO NASCIMENTO':   '5599991122742',  // GOMAN - PDT  (lido: 9112-1242 — confirmar se não é 9112-1242)
  'WERBETH RODRIGUES CARVALHO':              '5587981782927',  // GOMAN - BCB
}

/** Número de fallback quando o supervisor não for encontrado no mapeamento. */
export const SUPERVISOR_WHATSAPP_FALLBACK = ''

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/** Retorna o número WhatsApp do supervisor, fallback ou null. */
export function getSupervisorWhatsapp(nomeSupervisor: string): string | null {
  const normalizado = norm(nomeSupervisor)
  for (const [key, numero] of Object.entries(SUPERVISOR_WHATSAPP)) {
    if (norm(key) === normalizado) return numero
  }
  return SUPERVISOR_WHATSAPP_FALLBACK || null
}

/** Retorna true somente se o supervisor tem número real cadastrado (mínimo 12 dígitos). */
export function isSupervisorReconhecido(nomeSupervisor: string): boolean {
  const normalizado = norm(nomeSupervisor)
  for (const [key, numero] of Object.entries(SUPERVISOR_WHATSAPP)) {
    if (norm(key) === normalizado && numero.length >= 12) return true
  }
  return false
}

/** Gera o link wa.me com a mensagem pré-formatada. */
export function buildWhatsappLink(params: {
  numero: string
  nomeSupervisor: string
  operador: string
  veiculo: string
  ncCount: number
  ncImperativos: number
  itensNc: { label: string; imperativo: boolean }[]
}): string {
  const { numero, nomeSupervisor, operador, veiculo, ncCount, ncImperativos, itensNc } = params
  const bloqueado = ncImperativos > 0
  const status = bloqueado ? '🚫 VEÍCULO IMPEDIDO' : '⚠ NC REGISTRADO'

  const listaItens = itensNc
    .map((it) => `${it.imperativo ? '🚫' : '⚠'} ${it.label}`)
    .join('\n')

  const linhas = [
    status,
    '',
    `Olá, ${nomeSupervisor}!`,
    `O operador *${operador}* acabou de concluir um checklist com *${ncCount} item(s) NC*.`,
    `Veículo: *${veiculo || 'não informado'}*`,
    ...(bloqueado ? [`\n⛔ *${ncImperativos} item(s) impeditivo(s)* — veículo impedido de operar até correção.`] : []),
    '',
    '*Itens com NC:*',
    listaItens,
    '',
    'Por favor, verifique e tome as providências necessárias.',
  ]

  return `https://wa.me/${numero}?text=${encodeURIComponent(linhas.join('\n'))}`
}
