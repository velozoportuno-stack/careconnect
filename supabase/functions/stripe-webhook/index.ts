import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

// Admin client — bypasses RLS so we can update bookings/profiles from webhook events
const adminSupabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), { status: 400 })
  }

  const body = await req.text()
  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Webhook signature verification failed'
    console.error('[stripe-webhook] signature error:', msg)
    return new Response(JSON.stringify({ error: msg }), { status: 400 })
  }

  try {
    switch (event.type) {
      // ── Professional completes (or updates) their Connect onboarding ─────────
      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        const status = account.charges_enabled && account.details_submitted
          ? 'active'
          : 'pending'
        await adminSupabase
          .from('profiles')
          .update({ stripe_connect_status: status })
          .eq('stripe_account_id', account.id)
        console.log(`[stripe-webhook] account.updated ${account.id} → ${status}`)
        break
      }

      // ── Client payment succeeded — mark booking as paid ───────────────────────
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        const bookingId = pi.metadata?.bookingId
        if (bookingId) {
          await adminSupabase
            .from('bookings')
            .update({
              payment_status: 'paid',
              stripe_payment_intent_id: pi.id,
            })
            .eq('id', bookingId)
          console.log(`[stripe-webhook] payment_intent.succeeded booking=${bookingId} pi=${pi.id}`)
        }
        break
      }

      // ── Payment failed — mark booking accordingly ─────────────────────────────
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        const bookingId = pi.metadata?.bookingId
        if (bookingId) {
          await adminSupabase
            .from('bookings')
            .update({ payment_status: 'failed' })
            .eq('id', bookingId)
          console.log(`[stripe-webhook] payment_intent.payment_failed booking=${bookingId}`)
        }
        break
      }

      default:
        // Ignore unhandled event types
        break
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal webhook processing error'
    console.error('[stripe-webhook] processing error:', msg)
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  }
})
