/**
 * Edge Function: reset-user-password
 *
 * Permite que um admin autenticado redefina a senha de qualquer usuário.
 * Usa a service role key (secret SUPABASE_SERVICE_ROLE_KEY) para chamar
 * a Admin API do Supabase — nunca exposta ao frontend.
 *
 * POST { userId: string, newPassword: string }
 * Header: Authorization: Bearer <jwt do admin logado>
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey     = Deno.env.get('SUPABASE_ANON_KEY')!

    // Verifica se o chamador é admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders })
    }

    // Verifica role admin na tabela profiles
    const adminClient = createClient(supabaseUrl, serviceKey)
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: corsHeaders })
    }

    // Lê o body
    const { userId, newPassword } = await req.json() as { userId: string; newPassword: string }
    if (!userId || !newPassword || newPassword.length < 6) {
      return new Response(JSON.stringify({ error: 'invalid_params' }), { status: 400, headers: corsHeaders })
    }

    // Redefine a senha via Admin API
    const { error } = await adminClient.auth.admin.updateUserById(userId, { password: newPassword })
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
