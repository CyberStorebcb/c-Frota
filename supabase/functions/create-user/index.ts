/**
 * Edge Function: create-user
 *
 * Permite que um admin autenticado crie utilizadores ou envie convite por e-mail.
 * POST { mode: 'create' | 'invite', email: string, password?: string, role: 'admin' | 'user' }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Body = {
  mode?: 'create' | 'invite'
  email?: string
  password?: string
  role?: 'admin' | 'user'
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'unauthorized' }, 401)
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser()
    if (!caller) {
      return jsonResponse({ error: 'unauthorized' }, 401)
    }

    const adminClient = createClient(supabaseUrl, serviceKey)
    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', caller.id).single()

    if (profile?.role !== 'admin') {
      return jsonResponse({ error: 'forbidden' }, 403)
    }

    const body = (await req.json()) as Body
    const mode = body.mode === 'invite' ? 'invite' : 'create'
    const email = (body.email ?? '').trim().toLowerCase()
    const role = body.role === 'admin' ? 'admin' : 'user'
    const password = body.password ?? ''

    if (!email || !email.includes('@')) {
      return jsonResponse({ error: 'invalid_email' }, 400)
    }

    if (mode === 'create') {
      if (!password || password.length < 6) {
        return jsonResponse({ error: 'invalid_password' }, 400)
      }

      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (createError) {
        const msg = createError.message.toLowerCase()
        if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
          return jsonResponse({ error: 'email_exists' }, 409)
        }
        return jsonResponse({ error: createError.message }, 500)
      }

      const userId = created.user?.id
      if (!userId) {
        return jsonResponse({ error: 'create_failed' }, 500)
      }

      await adminClient.from('profiles').upsert({ id: userId, role })

      return jsonResponse({ ok: true, mode: 'create', userId, email }, 200)
    }

    const siteUrl = (Deno.env.get('APP_SITE_URL') ?? '').replace(/\/$/, '')
    const redirectTo = siteUrl ? `${siteUrl}/login` : undefined

    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      redirectTo ? { redirectTo } : undefined,
    )

    if (inviteError) {
      const msg = inviteError.message.toLowerCase()
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        return jsonResponse({ error: 'email_exists' }, 409)
      }
      return jsonResponse({ error: inviteError.message }, 500)
    }

    const userId = invited.user?.id
    if (userId) {
      await adminClient.from('profiles').upsert({ id: userId, role })
    }

    return jsonResponse({ ok: true, mode: 'invite', userId: userId ?? null, email }, 200)
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500)
  }
})
