/**
 * Edge Function: notify-checklist-nc
 *
 * Disparada via Database Webhook do Supabase quando um novo checklist
 * é inserido na tabela `checklists` com nc_count > 0.
 *
 * Variáveis de ambiente (configurar em Supabase > Edge Functions > Secrets):
 *   RESEND_API_KEY   — Chave da API do Resend (resend.com → API Keys → Create API Key)
 *   EMAIL_FROM       — Endereço remetente verificado no Resend (ex: frota@suaempresa.com)
 *   WEBHOOK_SECRET   — Segredo para validar que a chamada veio do Supabase
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// ---------------------------------------------------------------------------
// Mapeamento supervisor → email
// Preencha os emails reais antes de colocar em produção.
// ---------------------------------------------------------------------------
const SUPERVISOR_EMAIL: Record<string, string> = {
  'ANTONIO MARCOS SALAZAR DOS REIS':         'placeholder@email.com',
  'ANTONIO MARCOS SANTOS ALENCAR':           'placeholder@email.com',
  'ARLISON ROGERIO MARTINS LIMA':            'placeholder@email.com',
  'CRISTOPHE DANIEL DOS SANTOS MELO':        'placeholder@email.com',
  'DEILTON SOUZA RIBEIRO':                   'placeholder@email.com',
  'EDIVAN DE LIMA CARVALHO':                 'placeholder@email.com',
  'EVERALDO NOGUEIRA FILHO':                 'placeholder@email.com',
  'GUILHERME FONSECA DE SOUSA NOGUEIRA':     'placeholder@email.com',
  'JOAO CLIMACO MEDEIROS DE AZEVEDO JUNIOR': 'placeholder@email.com',
  'JOSIEL MENESES DOS SANTOS':               'placeholder@email.com',
  'LEONARDO ESTRELA ANCHIETA':               'placeholder@email.com',
  'LUIS CARLOS DE SOUZA':                    'placeholder@email.com',
  'LUIS FILIPE CANTANHEDE ALVES':            'placeholder@email.com',
  'MESSIAS ABREU DOS SANTOS':                'placeholder@email.com',
  'MIKEIAS VELOSO PINHEIRO':                 'placeholder@email.com',
  'PABLO SILVA LOURA':                       'placeholder@email.com',
  'RAIMUNDO HERMESSON BRITO VIEIRA DA SILVA':'placeholder@email.com',
  'RAIMUNDO NONATO ALMEIDA DO NASCIMENTO':   'placeholder@email.com',
  'WERBETH RODRIGUES CARVALHO':              'placeholder@email.com',
  'ITALO BRUNO DA SILVA FONTES':              'italo.fontes@cgbengenharia.com.br',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ')
}

function getSupervisorEmail(nomeSupervisor: string): string | null {
  const normalizado = norm(nomeSupervisor)
  for (const [key, email] of Object.entries(SUPERVISOR_EMAIL)) {
    if (norm(key) === normalizado) {
      return email === 'placeholder@email.com' ? null : email
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Monta o HTML do email
// ---------------------------------------------------------------------------
function buildEmailHtml(params: {
  nomeSupervisor: string
  nomeOperador: string
  matricula: string
  placa: string
  prefixo: string
  localidade: string
  ncCount: number
  ncImperativos: number
  itensNc: { id: string; obs: string }[]
  dataInspecao: string
}): { subject: string; html: string } {
  const {
    nomeSupervisor, nomeOperador, matricula, placa, prefixo,
    localidade, ncCount, ncImperativos, itensNc, dataInspecao,
  } = params

  const bloqueado = ncImperativos > 0
  const dataFmt = dataInspecao
    ? new Date(dataInspecao + 'T00:00:00').toLocaleDateString('pt-BR')
    : '—'

  const subject = bloqueado
    ? `🚫 VEÍCULO IMPEDIDO — ${placa || 'Checklist'} com NC impeditivo`
    : `⚠ Checklist com NC — ${placa || nomeOperador} (${dataFmt})`

  const corStatus = bloqueado ? '#dc2626' : '#d97706'
  const bgStatus  = bloqueado ? '#fef2f2' : '#fffbeb'
  const labelStatus = bloqueado ? '🚫 VEÍCULO IMPEDIDO DE OPERAR' : '⚠ CHECKLIST COM NÃO CONFORMIDADE'

  const itensHtml = itensNc.map(({ id, obs }) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#374151;">
        ${bloqueado ? '🚫' : '⚠'} <strong>${id}</strong>
        ${obs ? `<br><span style="color:#6b7280;font-size:13px;">${obs}</span>` : ''}
      </td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <tr><td style="background:#0b1020;padding:24px 32px;">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:900;letter-spacing:-0.5px;">
            🚛 Sistema de Gestão de Frota
          </p>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">Notificação automática de checklist</p>
        </td></tr>

        <!-- Status banner -->
        <tr><td style="background:${bgStatus};padding:16px 32px;border-bottom:3px solid ${corStatus};">
          <p style="margin:0;color:${corStatus};font-size:16px;font-weight:900;">${labelStatus}</p>
        </td></tr>

        <!-- Saudação -->
        <tr><td style="padding:24px 32px 0;">
          <p style="margin:0;font-size:15px;color:#111827;">
            Olá, <strong>${nomeSupervisor}</strong>!
          </p>
          <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">
            Um checklist foi concluído com <strong style="color:${corStatus};">${ncCount} item(s) não conforme(s)</strong>.
            ${bloqueado ? `<br><strong style="color:#dc2626;">O veículo está IMPEDIDO de ser operado até correção e verificação pelo supervisor.</strong>` : ''}
          </p>
        </td></tr>

        <!-- Dados do checklist -->
        <tr><td style="padding:20px 32px 0;">
          <p style="margin:0 0 10px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Dados do checklist</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <tr style="background:#f9fafb;">
              <td style="padding:8px 16px;font-size:13px;color:#6b7280;width:40%;">Operador</td>
              <td style="padding:8px 16px;font-size:14px;color:#111827;font-weight:700;">${nomeOperador} <span style="color:#9ca3af;font-weight:400;">(Mat. ${matricula})</span></td>
            </tr>
            <tr>
              <td style="padding:8px 16px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">Veículo</td>
              <td style="padding:8px 16px;font-size:14px;color:#111827;font-weight:700;border-top:1px solid #e5e7eb;">${placa || '—'}${prefixo ? ` — ${prefixo}` : ''}</td>
            </tr>
            <tr style="background:#f9fafb;">
              <td style="padding:8px 16px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">Localidade</td>
              <td style="padding:8px 16px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb;">${localidade || '—'}</td>
            </tr>
            <tr>
              <td style="padding:8px 16px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">Data</td>
              <td style="padding:8px 16px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb;">${dataFmt}</td>
            </tr>
          </table>
        </td></tr>

        <!-- Itens NC -->
        <tr><td style="padding:20px 32px 0;">
          <p style="margin:0 0 10px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Itens com NC (${itensNc.length})</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            ${itensHtml}
          </table>
        </td></tr>

        <!-- Rodapé -->
        <tr><td style="padding:24px 32px;border-top:1px solid #e5e7eb;margin-top:24px;">
          <p style="margin:0;font-size:13px;color:#6b7280;">
            Por favor, verifique e tome as providências necessárias o quanto antes.
          </p>
          <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">
            Esta é uma notificação automática do Sistema de Gestão de Frota.<br>
            Não responda este email.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  return { subject, html }
}

// ---------------------------------------------------------------------------
// Envia o email via Resend
// ---------------------------------------------------------------------------
async function enviarEmail(params: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from   = Deno.env.get('EMAIL_FROM') ?? 'Frota <noreply@suaempresa.com>'

  if (!apiKey) {
    console.warn('[notify] RESEND_API_KEY não configurada — email não enviado.')
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Resend erro (${res.status}): ${text}`)
  }

  console.log(`[notify] Email enviado para ${params.to} — status ${res.status}`)
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  // Valida o secret do webhook
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

  // Webhook do Supabase envia { type, table, record, old_record }
  const record = (body.record ?? body) as Record<string, unknown>

  const ncCount = Number(record.nc_count ?? 0)
  if (ncCount === 0) {
    return new Response(JSON.stringify({ skipped: 'nc_count = 0' }), { status: 200 })
  }

  const nomeSupervisor = String(record.nome_supervisor ?? '').trim()
  if (!nomeSupervisor) {
    return new Response(JSON.stringify({ skipped: 'nome_supervisor vazio' }), { status: 200 })
  }

  const emailSupervisor = getSupervisorEmail(nomeSupervisor)
  if (!emailSupervisor) {
    console.warn(`[notify] Email não mapeado para supervisor: "${nomeSupervisor}"`)
    return new Response(JSON.stringify({ skipped: 'email do supervisor não configurado' }), { status: 200 })
  }

  // Extrai itens NC
  const respostas   = (record.respostas   ?? {}) as Record<string, string>
  const observacoes = (record.observacoes ?? {}) as Record<string, string>
  const ncImperativos = Number(record.nc_imperativos ?? 0)

  const itensNc = Object.entries(respostas)
    .filter(([, v]) => v === 'nc')
    .map(([id]) => {
      const obs = observacoes[id] ?? ''
      return { id, obs: obs.split('\n__fotos__:')[0]?.trim() ?? '' }
    })

  const dadosVeiculo = (record.dados_veiculo ?? {}) as Record<string, string>

  const { subject, html } = buildEmailHtml({
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
    await enviarEmail({ to: emailSupervisor, subject, html })
    return new Response(JSON.stringify({ ok: true, to: emailSupervisor, ncCount }), { status: 200 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[notify] Erro ao enviar email:', msg)
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  }
})
