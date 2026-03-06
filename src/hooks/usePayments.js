import { useState } from 'react'
import { stripePromise } from '../lib/stripe'
import { supabase } from '../lib/supabase'

export const usePayments = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const initiatePayment = async ({ amount, currency = 'eur', bookingId }) => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada. Faça login novamente.')

      // Chamar Supabase Edge Function (secret key fica server-side)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ amount, currency, bookingId }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Erro ao criar pagamento')

      const { clientSecret } = result
      const stripe = await stripePromise
      const { error: stripeError } = await stripe.confirmPayment({
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/booking/success`,
        },
      })

      if (stripeError) throw new Error(stripeError.message)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, initiatePayment }
}
