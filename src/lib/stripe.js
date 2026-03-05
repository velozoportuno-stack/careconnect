import { loadStripe } from '@stripe/stripe-js'

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY

if (!stripePublicKey) {
  console.warn('⚠️ Stripe não configurado. Adicione VITE_STRIPE_PUBLIC_KEY no .env')
}

export const stripePromise = loadStripe(stripePublicKey || 'placeholder')
