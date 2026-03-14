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

    // Auth client — verify the JWT and get the user
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { payment_method_id, cardholder_name } = await req.json()
    if (!payment_method_id) {
      return new Response(JSON.stringify({ error: 'payment_method_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Service-role client — bypasses RLS for trusted server operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Fetch profile to check if Stripe customer already exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, full_name')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      // Create Stripe customer linked to this user
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.full_name || cardholder_name || undefined,
        metadata: { supabase_uid: user.id },
      })
      customerId = customer.id
    }

    // Attach the payment method to the customer
    await stripe.paymentMethods.attach(payment_method_id, { customer: customerId })

    // Set as default payment method on the customer
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: payment_method_id },
    })

    // Retrieve card details to build the human-readable summary
    const pm = await stripe.paymentMethods.retrieve(payment_method_id)
    const { brand, last4, exp_month, exp_year } = pm.card!
    const brandLabel = brand.charAt(0).toUpperCase() + brand.slice(1)
    const summary = `${brandLabel} **** ${last4} — ${String(exp_month).padStart(2, '0')}/${exp_year}`

    // Persist to profiles
    await supabase.from('profiles').update({
      stripe_customer_id:        customerId,
      default_payment_method_id: payment_method_id,
      stripe_card_summary:       summary,
    }).eq('id', user.id)

    return new Response(
      JSON.stringify({ stripe_customer_id: customerId, default_payment_method_id: payment_method_id, stripe_card_summary: summary }),
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
