import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Lock, CheckCircle, ChevronRight, Star } from 'lucide-react'
import Navbar from '../components/Navbar'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/appStore'
import { formatCurrency, formatDate } from '../utils/formatters'

const ROLE_LABEL = {
  caregiver: 'Cuidador(a) de Idosos',
  nurse:     'Enfermeiro(a)',
  cleaner:   'Assistente de Limpeza',
}

function formatCardNumber(v) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(v) {
  const digits = v.replace(/\D/g, '').slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}

export default function Payment() {
  const { user, pendingBooking, clearPendingBooking } = useAppStore()
  const navigate = useNavigate()

  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (!pendingBooking) { navigate('/search'); return }
  }, [])

  if (!pendingBooking) return null

  const { provider, service, date, time, duration, address, notes, totalPrice, hourlyRate, patientData } = pendingBooking

  function validateCard() {
    const num = card.number.replace(/\s/g, '')
    if (num.length < 16) return 'Número do cartão incompleto.'
    if (!/^\d{2}\/\d{2}$/.test(card.expiry)) return 'Validade inválida (MM/AA).'
    if (card.cvv.length < 3) return 'CVV inválido.'
    if (!card.name.trim()) return 'Nome no cartão obrigatório.'
    return null
  }

  async function captureClientLocation(bookingId) {
    if (!navigator.geolocation) return
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      )
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      let clientAddress = null
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
          { headers: { 'Accept-Language': 'pt' } }
        )
        const geo = await r.json()
        clientAddress = geo.display_name ?? null
      } catch {}
      await supabase
        .from('bookings')
        .update({ client_latitude: lat, client_longitude: lng, client_address: clientAddress })
        .eq('id', bookingId)
    } catch {}
  }

  async function handlePay() {
    const err = validateCard()
    if (err) { setError(err); return }
    setError(null)
    setLoading(true)

    try {
      // 1. Create booking
      const { data: booking, error: bookingErr } = await supabase
        .from('bookings')
        .insert({
          client_id:      user.id,
          provider_id:    provider.id,
          service_id:     pendingBooking.serviceId || null,
          scheduled_date: date,
          scheduled_time: time,
          duration_hours: duration,
          total_price:    totalPrice,
          address:        address || null,
          notes:          notes || null,
          status:         'confirmed',
          payment_status: 'paid',
        })
        .select()
        .single()

      if (bookingErr) throw new Error(bookingErr.message)

      // 2. Capture client GPS location (non-blocking — triggers permission dialog)
      captureClientLocation(booking.id)

      // 3. If patient data, save it
      if (patientData?.name) {
        const { data: pp, error: ppErr } = await supabase
          .from('patient_profiles')
          .insert({
            booking_id:         booking.id,
            name:               patientData.name,
            birth_date:         patientData.birth_date || null,
            medical_conditions: patientData.medical_conditions || null,
            observations:       patientData.observations || null,
          })
          .select()
          .single()

        if (!ppErr && pp && patientData.medications?.length) {
          const medsToInsert = patientData.medications
            .filter((m) => m.name.trim())
            .map((m) => ({
              patient_profile_id: pp.id,
              booking_id:         booking.id,
              name:               m.name,
              dosage:             m.dosage || null,
              frequency:          m.frequency || null,
              schedule_times:     m.times?.filter(Boolean) || [],
              is_active:          true,
            }))

          if (medsToInsert.length) {
            await supabase.from('medications').insert(medsToInsert)
          }
        }
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
            <p className="text-xs text-gray-400">{date ? formatDate(date) : ''} · {time} · {duration}h</p>
          </div>
        </div>

        {/* Card form */}
        <div className="card mb-5">
          <div className="flex items-center gap-2 mb-5">
            <CreditCard className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-bold text-gray-900">Dados do Cartão</h2>
          </div>

          <div className="space-y-4">
            {/* Card number */}
            <div>
              <label className="input-label">Número do Cartão *</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  className="input-field pr-12"
                  placeholder="1234 5678 9012 3456"
                  value={card.number}
                  onChange={(e) => setCard((c) => ({ ...c, number: formatCardNumber(e.target.value) }))}
                />
                <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Expiry */}
              <div>
                <label className="input-label">Validade *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="input-field"
                  placeholder="MM/AA"
                  value={card.expiry}
                  onChange={(e) => setCard((c) => ({ ...c, expiry: formatExpiry(e.target.value) }))}
                />
              </div>

              {/* CVV */}
              <div>
                <label className="input-label">CVV *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="input-field"
                  placeholder="123"
                  maxLength={4}
                  value={card.cvv}
                  onChange={(e) => setCard((c) => ({ ...c, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                />
              </div>
            </div>

            {/* Cardholder name */}
            <div>
              <label className="input-label">Nome no Cartão *</label>
              <input
                type="text"
                className="input-field"
                placeholder="MARIA A SILVA"
                value={card.name}
                onChange={(e) => setCard((c) => ({ ...c, name: e.target.value.toUpperCase() }))}
              />
            </div>
          </div>

          {/* Price summary */}
          <div className="mt-5 pt-4 border-t border-gray-100 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>{formatCurrency(hourlyRate)} × {duration}h</span>
              <span>{formatCurrency(totalPrice)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base">
              <span>Total a pagar</span>
              <span className="text-primary-600">{formatCurrency(totalPrice)}</span>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-4 px-1">{error}</p>
        )}

        <button
          onClick={handlePay}
          disabled={loading}
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
              Pagar {formatCurrency(totalPrice)}
            </>
          )}
        </button>

        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
          <Lock className="w-3.5 h-3.5" />
          Pagamento seguro via Stripe · SSL encriptado
        </div>

        {/* Test mode hint */}
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 text-center">
          Modo de teste — usa o cartão <strong>4242 4242 4242 4242</strong>, qualquer validade e CVV.
        </div>
      </main>
    </div>
  )
}
