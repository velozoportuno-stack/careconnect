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

    // Buscar perfil do provider
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, stripe_account_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Perfil não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const allowedRoles = ['caregiver', 'nurse', 'cleaner']
    if (!allowedRoles.includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Apenas profissionais podem registar conta de pagamento' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { returnUrl } = await req.json().catch(() => ({ returnUrl: null }))
    const appOrigin = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
    const successUrl = returnUrl ?? `${appOrigin}/dashboard?stripe=success`
    const refreshUrl = `${appOrigin}/dashboard?stripe=refresh`

    let stripeAccountId = profile.stripe_account_id

    // Criar conta Express se ainda não existir
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'PT',
        email: profile.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: { supabaseUserId: user.id },
      })

      stripeAccountId = account.id

      // Guardar stripe_account_id no perfil
      await supabase
        .from('profiles')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', user.id)
    }

    // Gerar link de onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: successUrl,
      type: 'account_onboarding',
    })

    return new Response(
      JSON.stringify({ url: accountLink.url, stripeAccountId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
