import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Lock, CheckCircle, Star, Smartphone, Zap } from 'lucide-react'
import Navbar from '../components/Navbar'
import { supabase } from '../lib/supabase'
import { stripePromise } from '../lib/stripe'
import { useAppStore } from '../store/appStore'
import { formatCurrency, formatDate } from '../utils/formatters'

const ROLE_LABEL = {
  caregiver: 'Cuidador(a) de Idosos',
  nurse:     'Enfermeiro(a)',
  cleaner:   'Assistente de Limpeza',
}

function PriceSummary({ bookingType, hourlyRate, dailyRate, duration, days, totalPrice }) {
  const isDays = bookingType === 'days'
  const rate = isDays ? dailyRate : hourlyRate
  const qty = isDays ? days : duration
  const unit = isDays ? `dia${qty !== 1 ? 's' : ''}` : 'h'
  return (
    <div className="mt-5 pt-4 border-t border-gray-100 space-y-2 text-sm">
      <div className="flex justify-between text-gray-600">
        <span>{formatCurrency(rate)} × {qty}{unit}</span>
        <span>{formatCurrency(totalPrice)}</span>
      </div>
      <div className="flex justify-between font-bold text-gray-900 text-base">
        <span>Total a pagar</span>
        <span className="text-primary-600">{formatCurrency(totalPrice)}</span>
      </div>
    </div>
  )
}

export default function Payment() {
  const { user, pendingBooking, clearPendingBooking } = useAppStore()
  const navigate = useNavigate()

  const [phone, setPhone]             = useState('')
  const [pixKey, setPixKey]           = useState('')
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [clientCountry, setClientCountry] = useState(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [success, setSuccess]         = useState(false)

  // Stripe Card Element (vanilla Stripe.js — no React wrapper needed)
  const cardElementRef  = useRef(null)   // DOM container node
  const stripeCardRef   = useRef(null)   // Stripe CardElement instance
  const stripeRef       = useRef(null)   // Stripe instance
  const [cardReady, setCardReady] = useState(false)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (!pendingBooking) { navigate('/search'); return }
    supabase.from('profiles').select('country').eq('id', user.id).single()
      .then(({ data }) => {
        if (!data?.country) return
        setClientCountry(data.country)
        if (data.country === 'PT') setPaymentMethod('mbway')
        else if (data.country === 'BR') setPaymentMethod('pix')
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Mount Stripe CardElement whenever card method is selected
  useEffect(() => {
    if (paymentMethod !== 'card') {
      // Destroy existing element when switching away
      if (stripeCardRef.current) {
        stripeCardRef.current.destroy()
        stripeCardRef.current = null
        setCardReady(false)
      }
      return
    }

    // Already mounted
    if (stripeCardRef.current) return

    let cancelled = false

    stripePromise.then((stripe) => {
      if (cancelled || !stripe || !cardElementRef.current) return
      stripeRef.current = stripe
      const elements = stripe.elements()
      const card = elements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#1f2937',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            '::placeholder': { color: '#9ca3af' },
          },
          invalid: { color: '#ef4444' },
        },
        hidePostalCode: true,
      })
      card.mount(cardElementRef.current)
      card.on('ready', () => setCardReady(true))
      stripeCardRef.current = card
    })

    return () => { cancelled = true }
  }, [paymentMethod])

  if (!pendingBooking) return null

  const {
    provider, service, date, time, duration, days, bookingType,
    address, addressLat, addressLng, postalCode, notes,
    totalPrice, hourlyRate, dailyRate, patientData,
    client_address, client_postal_code, client_city, client_notes,
    client_lat, client_lng,
  } = pendingBooking

  // Currency: EUR for PT/default, BRL for BR
  const currency = clientCountry === 'BR' ? 'brl' : 'eur'

  const availableMethods =
    clientCountry === 'PT' ? [
      { id: 'mbway', label: 'MB WAY',  Icon: Smartphone },
      { id: 'card',  label: 'Cartão',  Icon: CreditCard },
    ] :
    clientCountry === 'BR' ? [
      { id: 'pix',  label: 'PIX',    Icon: Zap },
      { id: 'card', label: 'Cartão', Icon: CreditCard },
    ] :
    [{ id: 'card', label: 'Cartão', Icon: CreditCard }]

  function validatePayment() {
    if (paymentMethod === 'card') {
      if (!stripeCardRef.current) return 'Elemento de cartão não inicializado. Recarrega a página.'
    }
    if (paymentMethod === 'mbway') {
      if (!phone.trim()) return 'Número de telemóvel MB WAY obrigatório.'
    }
    if (paymentMethod === 'pix') {
      if (!pixKey.trim()) return 'Chave PIX obrigatória.'
    }
    return null
  }

  // Shared booking fields (used by all payment methods)
  const bookingFields = {
    client_id:      user.id,
    provider_id:    provider.id,
    service_id:     pendingBooking.serviceId || null,
    scheduled_date: date,
    scheduled_time: time,
    duration_hours: duration,
    booking_type:   bookingType || 'hours',
    days_count:     bookingType === 'days' ? days : null,
    total_price:    totalPrice,
    address:             address || client_address || null,
    client_address:      client_address || address || null,
    client_postal_code:  client_postal_code || postalCode || null,
    client_city:         client_city || null,
    client_notes:        client_notes || notes || null,
    client_latitude:     client_lat  ?? addressLat  ?? null,
    client_longitude:    client_lng  ?? addressLng  ?? null,
    postal_code:         postalCode || client_postal_code || null,
    notes:               notes || client_notes || null,
    status:              'confirmed',
    payment_method:      paymentMethod,
  }

  async function savePatientData(bookingId) {
    if (!patientData?.name) return
    const { data: savedPatient, error: patErr } = await supabase
      .from('patients')
      .insert({
        professional_id:         provider.id,
        client_id:               user.id,
        booking_id:              bookingId,
        name:                    patientData.name,
        date_of_birth:           patientData.birth_date        || null,
        medical_conditions:      patientData.medical_conditions || null,
        observations:            patientData.observations       || null,
        allergies:               patientData.allergies          || null,
        insurance:               patientData.insurance          || null,
        emergency_contact_name:  patientData.emergency_contact_name  || null,
        emergency_contact_phone: patientData.emergency_contact_phone || null,
        mobility_level:          patientData.mobility_level    || null,
        special_diet:            patientData.special_diet       || null,
      })
      .select()
      .single()

    if (!patErr && savedPatient && patientData.medications?.length) {
      for (const m of patientData.medications.filter((m) => m.name?.trim())) {
        const { data: savedMed } = await supabase
          .from('patient_medications')
          .insert({
            patient_id: savedPatient.id,
            name:       m.name,
            dosage:     m.dosage    || null,
            frequency:  m.frequency || null,
            times:      m.times?.filter(Boolean) || [],
          })
          .select()
          .single()

        if (savedMed && m.times?.length && date) {
          const alarms = m.times
            .filter(Boolean)
            .map((t) => ({
              medication_id:  savedMed.id,
              patient_id:     savedPatient.id,
              scheduled_time: `${date}T${t}:00`,
            }))
          if (alarms.length) await supabase.from('medication_alarms').insert(alarms)
        }
      }
    }
  }

  async function handlePay() {
    const err = validatePayment()
    if (err) { setError(err); return }
    setError(null)
    setLoading(true)

    try {
      if (paymentMethod === 'card') {
        // ── Real Stripe card payment ──────────────────────────────────────────
        // 1. Create booking in 'pending' state so we have a bookingId for the PaymentIntent
        const { data: booking, error: bookingErr } = await supabase
          .from('bookings')
          .insert({ ...bookingFields, payment_status: 'pending' })
          .select()
          .single()
        if (bookingErr) throw new Error(bookingErr.message)

        // 2. Create PaymentIntent with 15% platform fee + automatic transfer to provider
        const { data: { session } } = await supabase.auth.getSession()
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const resp = await fetch(`${supabaseUrl}/functions/v1/create-payment-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ amount: totalPrice, currency, bookingId: booking.id }),
        })

        if (!resp.ok) {
          const errData = await resp.json()
          // Remove the dangling pending booking so it doesn't pollute the dashboard
          await supabase.from('bookings').delete().eq('id', booking.id)
          throw new Error(errData.error ?? 'Erro ao iniciar pagamento')
        }

        const { clientSecret } = await resp.json()

        // 3. Confirm card payment through Stripe (card data never touches our server)
        const { error: stripeError, paymentIntent } = await stripeRef.current.confirmCardPayment(
          clientSecret,
          { payment_method: { card: stripeCardRef.current } },
        )

        if (stripeError) {
          await supabase.from('bookings').delete().eq('id', booking.id)
          throw new Error(stripeError.message)
        }

        // 4. Mark booking as paid (webhook will also do this, but update immediately for UX)
        await supabase
          .from('bookings')
          .update({
            payment_status: 'paid',
            stripe_payment_intent_id: paymentIntent.id,
          })
          .eq('id', booking.id)

        await savePatientData(booking.id)
        supabase.functions
          .invoke('send-booking-emails', { body: { bookingId: booking.id } })
          .catch(() => {})

      } else {
        // ── MB WAY / PIX — simulated payment (manual verification) ────────────
        const { data: booking, error: bookingErr } = await supabase
          .from('bookings')
          .insert({ ...bookingFields, payment_status: 'paid' })
          .select()
          .single()
        if (bookingErr) throw new Error(bookingErr.message)

        await savePatientData(booking.id)
        supabase.functions
          .invoke('send-booking-emails', { body: { bookingId: booking.id } })
          .catch(() => {})
      }

      setSuccess(true)
      clearPendingBooking()
      setTimeout(() => navigate('/dashboard'), 2500)
    } catch (e) {
      setError(e.message || 'Erro ao processar pagamento. Tenta novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="card text-center max-w-sm w-full py-12">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Pagamento Confirmado!</h2>
          <p className="text-gray-500 mb-1">O seu agendamento está confirmado.</p>
          <p className="text-gray-400 text-sm">A redirecionar para o dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-lg mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Pagamento</h1>

        {/* Booking summary mini-card */}
        <div className="card mb-5 flex items-center gap-4">
          {provider?.avatar_url ? (
            <img
              src={provider.avatar_url}
              alt={provider.full_name}
              className="w-14 h-14 rounded-2xl object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-primary-100 text-primary-700 font-bold text-lg
                            flex items-center justify-center flex-shrink-0">
              {provider?.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900">{provider?.full_name}</p>
            <p className="text-sm text-primary-600">{ROLE_LABEL[provider?.role] || provider?.role}</p>
            {provider?.rating > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-xs font-semibold text-gray-600">{Number(provider.rating).toFixed(1)}</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-xl font-extrabold text-primary-600">{formatCurrency(totalPrice)}</p>
            <p className="text-xs text-gray-400">
              {date ? formatDate(date) : ''}
              {bookingType === 'days'
                ? ` · ${days} dia${days !== 1 ? 's' : ''}`
                : ` · ${time} · ${duration}h`}
            </p>
          </div>
        </div>

        {/* Payment method selector */}
        {availableMethods.length > 1 && (
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
            {availableMethods.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => { setPaymentMethod(id); setError(null) }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all
                            ${paymentMethod === id
                              ? 'bg-white shadow-sm text-primary-600'
                              : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* MB WAY form */}
        {paymentMethod === 'mbway' && (
          <div className="card mb-5">
            <div className="flex items-center gap-2 mb-5">
              <Smartphone className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-bold text-gray-900">MB WAY</h2>
            </div>
            <div>
              <label className="input-label">Número de Telemóvel *</label>
              <input
                type="tel"
                className="input-field"
                placeholder="+351 912 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                Receberás uma notificação MB WAY para confirmar o pagamento.
              </p>
            </div>
            <PriceSummary bookingType={bookingType} hourlyRate={hourlyRate} dailyRate={dailyRate} duration={duration} days={days} totalPrice={totalPrice} />
          </div>
        )}

        {/* PIX form */}
        {paymentMethod === 'pix' && (
          <div className="card mb-5">
            <div className="flex items-center gap-2 mb-5">
              <Zap className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-bold text-gray-900">PIX</h2>
            </div>
            <div>
              <label className="input-label">Chave PIX *</label>
              <input
                type="text"
                className="input-field"
                placeholder="CPF, email, telefone ou chave aleatória"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                Após confirmar, receberás os dados para transferência via PIX.
              </p>
            </div>
            <PriceSummary bookingType={bookingType} hourlyRate={hourlyRate} dailyRate={dailyRate} duration={duration} days={days} totalPrice={totalPrice} />
          </div>
        )}

        {/* Card form — Stripe CardElement (PCI-compliant, card data never touches our server) */}
        {paymentMethod === 'card' && (
          <div className="card mb-5">
            <div className="flex items-center gap-2 mb-5">
              <CreditCard className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-bold text-gray-900">Dados do Cartão</h2>
            </div>

            {/* Stripe injects the secure card input here */}
            <div
              ref={cardElementRef}
              className="px-4 py-3 border border-gray-200 rounded-xl bg-white focus-within:border-primary-400 transition-colors"
            />

            {!cardReady && (
              <p className="text-xs text-gray-400 mt-2 text-center">A carregar formulário seguro...</p>
            )}

            <PriceSummary bookingType={bookingType} hourlyRate={hourlyRate} dailyRate={dailyRate} duration={duration} days={days} totalPrice={totalPrice} />
          </div>
        )}

        {error && (
          <p className="text-red-500 text-sm mb-4 px-1">{error}</p>
        )}

        <button
          onClick={handlePay}
          disabled={loading || (paymentMethod === 'card' && !cardReady)}
          className="btn-primary w-full text-base py-4 disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              A processar pagamento...
            </span>
          ) : (
            <>
              <Lock className="w-5 h-5" />
              Pagar {formatCurrency(totalPrice)}{' '}
              {paymentMethod === 'mbway' ? 'via MB WAY'
               : paymentMethod === 'pix' ? 'via PIX'
               : 'com cartão'}
            </>
          )}
        </button>

        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
          <Lock className="w-3.5 h-3.5" />
          Pagamento seguro · SSL encriptado · Processado pela Stripe
        </div>

        {paymentMethod === 'card' && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 text-center">
            Modo de teste — usa o cartão <strong>4242 4242 4242 4242</strong>, qualquer validade futura e CVV.
          </div>
        )}
      </main>
    </div>
  )
}
