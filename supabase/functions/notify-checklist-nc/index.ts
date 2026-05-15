/**
 * Edge Function: notify-checklist-nc
 *
 * Disparada via Database Webhook do Supabase quando um novo checklist
 * é inserido na tabela `checklists` com nc_count > 0.
 *
 * Secrets (Supabase > Edge Functions > Secrets):
 *   RESEND_API_KEY  — chave da API do Resend
 *   EMAIL_FALLBACK  — email de fallback enquanto domínio não verificado (ex: cyberstorebcb@gmail.com)
 *   WEBHOOK_SECRET  — segredo para validar chamada do Supabase
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// ---------------------------------------------------------------------------
// Mapeamento supervisor → email
// ---------------------------------------------------------------------------
const SUPERVISOR_EMAIL: Record<string, string> = {
  'ANTONIO MARCOS SALAZAR DOS REIS':          'placeholder@email.com',
  'ANTONIO MARCOS SANTOS ALENCAR':            'placeholder@email.com',
  'ARLISON ROGERIO MARTINS LIMA':             'placeholder@email.com',
  'CRISTOPHE DANIEL DOS SANTOS MELO':         'placeholder@email.com',
  'DEILTON SOUZA RIBEIRO':                    'placeholder@email.com',
  'EDIVAN DE LIMA CARVALHO':                  'placeholder@email.com',
  'EVERALDO NOGUEIRA FILHO':                  'placeholder@email.com',
  'GUILHERME FONSECA DE SOUSA NOGUEIRA':      'placeholder@email.com',
  'JOAO CLIMACO MEDEIROS DE AZEVEDO JUNIOR':  'placeholder@email.com',
  'JOSIEL MENESES DOS SANTOS':                'placeholder@email.com',
  'LEONARDO ESTRELA ANCHIETA':                'placeholder@email.com',
  'LUIS CARLOS DE SOUZA':                     'placeholder@email.com',
  'LUIS FILIPE CANTANHEDE ALVES':             'placeholder@email.com',
  'MESSIAS ABREU DOS SANTOS':                 'placeholder@email.com',
  'MIKEIAS VELOSO PINHEIRO':                  'placeholder@email.com',
  'PABLO SILVA LOURA':                        'placeholder@email.com',
  'RAIMUNDO HERMESSON BRITO VIEIRA DA SILVA': 'placeholder@email.com',
  'RAIMUNDO NONATO ALMEIDA DO NASCIMENTO':    'placeholder@email.com',
  'WERBETH RODRIGUES CARVALHO':               'placeholder@email.com',
  'ITALO BRUNO DA SILVA FONTES':              'italo.fontes@cgbengenharia.com.br',
}

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim().replace(/\s+/g, ' ')
}

function getSupervisorEmail(nome: string): string | null {
  const n = norm(nome)
  for (const [key, email] of Object.entries(SUPERVISOR_EMAIL)) {
    if (norm(key) === n) return email === 'placeholder@email.com' ? null : email
  }
  return null
}

// ---------------------------------------------------------------------------
// HTML do email
// ---------------------------------------------------------------------------
function buildEmail(p: {
  nomeSupervisor: string; nomeOperador: string; matricula: string
  placa: string; prefixo: string; localidade: string
  ncCount: number; ncImperativos: number
  itensNc: { id: string; obs: string }[]; dataInspecao: string
}): { subject: string; html: string } {
  const bloqueado = p.ncImperativos > 0
  const dataFmt = p.dataInspecao
    ? new Date(p.dataInspecao + 'T00:00:00').toLocaleDateString('pt-BR') : '—'

  const subject = bloqueado
    ? `VEICULO IMPEDIDO — ${p.placa || 'Checklist'} com NC impeditivo`
    : `Checklist com NC — ${p.placa || p.nomeOperador} (${dataFmt})`

  const cor   = bloqueado ? '#dc2626' : '#d97706'
  const bg    = bloqueado ? '#fef2f2' : '#fffbeb'
  const label = bloqueado ? 'VEICULO IMPEDIDO DE OPERAR' : 'CHECKLIST COM NAO CONFORMIDADE'

  const itensHtml = p.itensNc.map(({ id, obs }) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#374151;">
        <strong>${id}</strong>
        ${obs ? `<br><span style="color:#6b7280;font-size:13px;">${obs}</span>` : ''}
      </td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
  <tr><td style="background:#0b1020;padding:24px 32px;">
    <p style="margin:0;color:#fff;font-size:20px;font-weight:900;">Sistema de Gestao de Frota</p>
    <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">Notificacao automatica de checklist</p>
  </td></tr>
  <tr><td style="background:${bg};padding:16px 32px;border-bottom:3px solid ${cor};">
    <p style="margin:0;color:${cor};font-size:16px;font-weight:900;">${label}</p>
  </td></tr>
  <tr><td style="padding:24px 32px 0;">
    <p style="margin:0;font-size:15px;color:#111827;">Ola, <strong>${p.nomeSupervisor}</strong>!</p>
    <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">
      Um checklist foi concluido com <strong style="color:${cor};">${p.ncCount} item(s) nao conforme(s)</strong>.
      ${bloqueado ? `<br><strong style="color:#dc2626;">O veiculo esta IMPEDIDO de operar ate correcao.</strong>` : ''}
    </p>
  </td></tr>
  <tr><td style="padding:20px 32px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <tr style="background:#f9fafb;">
        <td style="padding:8px 16px;font-size:13px;color:#6b7280;width:40%;">Operador</td>
        <td style="padding:8px 16px;font-size:14px;color:#111827;font-weight:700;">${p.nomeOperador} <span style="color:#9ca3af;font-weight:400;">(Mat. ${p.matricula})</span></td>
      </tr>
      <tr>
        <td style="padding:8px 16px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">Veiculo</td>
        <td style="padding:8px 16px;font-size:14px;color:#111827;font-weight:700;border-top:1px solid #e5e7eb;">${p.placa || '—'}${p.prefixo ? ` — ${p.prefixo}` : ''}</td>
      </tr>
      <tr style="background:#f9fafb;">
        <td style="padding:8px 16px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">Localidade</td>
        <td style="padding:8px 16px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb;">${p.localidade || '—'}</td>
      </tr>
      <tr>
        <td style="padding:8px 16px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">Data</td>
        <td style="padding:8px 16px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb;">${dataFmt}</td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="padding:20px 32px 0;">
    <p style="margin:0 0 10px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Itens com NC (${p.itensNc.length})</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      ${itensHtml}
    </table>
  </td></tr>
  <tr><td style="padding:24px 32px;border-top:1px solid #e5e7eb;margin-top:24px;">
    <p style="margin:0;font-size:13px;color:#6b7280;">Por favor, verifique e tome as providencias necessarias.</p>
    <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">Notificacao automatica — nao responda este email.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`

  return { subject, html }
}

// ---------------------------------------------------------------------------
// Envio via Brevo (Sendinblue) — sem necessidade de domínio verificado
// ---------------------------------------------------------------------------
async function enviarEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = Deno.env.get('BREVO_API_KEY') ?? ''
  if (!apiKey) throw new Error('BREVO_API_KEY não configurada')

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: { name: 'Frota CGB', email: 'cyberstorebcb@gmail.com' },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Brevo erro (${res.status}): ${text}`)
  }

  console.log(`[notify] Email enviado para ${to}`)
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  const secret = Deno.env.get('WEBHOOK_SECRET')
  if (secret) {
    const provided = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
    if (provided !== secret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  const record = (body.record ?? body) as Record<string, unknown>
  const ncCount = Number(record.nc_count ?? 0)
  if (ncCount === 0) {
    return new Response(JSON.stringify({ skipped: 'nc_count = 0' }), { status: 200 })
  }

  const nomeSupervisor = String(record.nome_supervisor ?? '').trim()
  if (!nomeSupervisor) {
    return new Response(JSON.stringify({ skipped: 'nome_supervisor vazio' }), { status: 200 })
  }

  // EMAIL_FALLBACK redireciona tudo para um email fixo (necessário enquanto domínio não verificado)
  const emailDestino = Deno.env.get('EMAIL_FALLBACK') ?? getSupervisorEmail(nomeSupervisor)
  if (!emailDestino) {
    console.warn(`[notify] Sem email para supervisor: "${nomeSupervisor}"`)
    return new Response(JSON.stringify({ skipped: 'email não configurado' }), { status: 200 })
  }

  const respostas    = (record.respostas   ?? {}) as Record<string, string>
  const observacoes  = (record.observacoes ?? {}) as Record<string, string>
  const ncImperativos = Number(record.nc_imperativos ?? 0)
  const dadosVeiculo  = (record.dados_veiculo ?? {}) as Record<string, string>

  const itensNc = Object.entries(respostas)
    .filter(([, v]) => v === 'nc')
    .map(([id]) => ({ id, obs: (observacoes[id] ?? '').split('\n__fotos__:')[0]?.trim() ?? '' }))

  const { subject, html } = buildEmail({
    nomeSupervisor,
    nomeOperador:  String(record.nome_operador ?? ''),
    matricula:     String(record.matricula ?? ''),
    placa:         dadosVeiculo['placa']      ?? '',
    prefixo:       dadosVeiculo['prefixo']    ?? '',
    localidade:    dadosVeiculo['localidade'] ?? '',
    ncCount,
    ncImperativos,
    itensNc,
    dataInspecao:  String(record.data_inspecao ?? ''),
  })

  try {
    await enviarEmail(emailDestino, subject, html)
    return new Response(JSON.stringify({ ok: true, to: emailDestino, ncCount }), { status: 200 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[notify] Erro:', msg)
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  }
})
