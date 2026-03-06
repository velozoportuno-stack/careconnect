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
    // Autenticar utilizador via token JWT do Supabase
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

    const { amount, currency = 'eur', bookingId } = await req.json()

    if (!amount || !bookingId) {
      return new Response(JSON.stringify({ error: 'amount e bookingId são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Buscar booking e stripe_account_id do provider
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id, total_price, client_id,
        provider:profiles!bookings_provider_id_fkey(id, stripe_account_id, full_name)
      `)
      .eq('id', bookingId)
      .eq('client_id', user.id)
      .single()

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: 'Reserva não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Calcular taxa da plataforma (15%)
    const amountInCents = Math.round(amount * 100)
    const platformFee = Math.round(amountInCents * 0.15)

    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: amountInCents,
      currency,
      metadata: {
        bookingId,
        clientId: user.id,
        providerId: booking.provider?.id ?? '',
      },
    }

    // Se o provider tiver conta Stripe Connect, usar transfer automático
    const providerStripeId = booking.provider?.stripe_account_id
    if (providerStripeId) {
      paymentIntentParams.application_fee_amount = platformFee
      paymentIntentParams.transfer_data = {
        destination: providerStripeId,
      }
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams)

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
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
