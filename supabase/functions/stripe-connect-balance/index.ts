import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_connect_status')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_account_id) {
      return new Response(JSON.stringify({ error: 'Conta Stripe não conectada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stripeAccountId = profile.stripe_account_id

    // Fetch balance on the connected account
    const balance = await stripe.balance.retrieve(
      {},
      { stripeAccount: stripeAccountId },
    )

    // Generate a single-use login link to the Express Dashboard
    const loginLink = await stripe.accounts.createLoginLink(stripeAccountId)

    // Sum all available and pending amounts (may span multiple currencies)
    const available = balance.available.reduce((sum, b) => sum + b.amount, 0) / 100
    const pending   = balance.pending.reduce((sum, b) => sum + b.amount, 0) / 100
    const currency  = balance.available[0]?.currency ?? 'eur'

    return new Response(
      JSON.stringify({
        available,
        pending,
        currency,
        dashboardUrl: loginLink.url,
        connectStatus: profile.stripe_connect_status ?? 'pending',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    console.error('[stripe-connect-balance] error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
