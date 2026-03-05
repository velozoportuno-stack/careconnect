import { useState } from 'react'
import { stripePromise } from '../lib/stripe'

export const usePayments = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const initiatePayment = async ({ amount, currency = 'eur', bookingId }) => {
    setLoading(true)
    setError(null)
    try {
      // Aqui integraria com seu backend para criar PaymentIntent
      // Exemplo: POST /api/payments/create-intent
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency, bookingId }),
      })
      const { clientSecret } = await response.json()

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
