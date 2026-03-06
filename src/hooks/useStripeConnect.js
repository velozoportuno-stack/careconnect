import { useState } from 'react'
import { supabase } from '../lib/supabase'

export const useStripeConnect = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Inicia o onboarding Stripe Connect para o provider.
   * Redireciona para o formulário Express da Stripe.
   */
  const startOnboarding = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada. Faça login novamente.')

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/stripe-connect-onboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ returnUrl: `${window.location.origin}/dashboard?stripe=success` }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Erro ao iniciar registo de pagamento')

      // Redirecionar para formulário Stripe Express
      window.location.href = result.url
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  /**
   * Verifica se o provider já tem conta Stripe Connect ativa.
   */
  const checkConnectStatus = async () => {
    const { data, error: dbError } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .single()

    if (dbError) return { connected: false, stripeAccountId: null }
    return {
      connected: !!data?.stripe_account_id,
      stripeAccountId: data?.stripe_account_id ?? null,
    }
  }

  return { loading, error, startOnboarding, checkConnectStatus }
}
