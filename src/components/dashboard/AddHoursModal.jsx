import { useState } from 'react'
import { X, Plus, Minus, CreditCard, Clock, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/appStore'
import { formatCurrency } from '../../utils/formatters'

function formatCardNumber(v) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

export default function AddHoursModal({ booking, onClose, onSuccess }) {
  const { user } = useAppStore()
  const [hours,   setHours]   = useState(1)
  const [step,    setStep]    = useState('choose') // 'choose' | 'pay'
  const [card,    setCard]    = useState({ number: '', expiry: '', cvv: '', name: '' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [done,    setDone]    = useState(false)

  const rate      = booking.service?.price_per_hour || booking.provider?.hourly_rate || 0
  const extra     = rate * hours

  async function handlePay() {
    const num = card.number.replace(/\s/g, '')
    if (num.length < 16) { setError('Número do cartão incompleto.'); return }
    if (!/^\d{2}\/\d{2}$/.test(card.expiry)) { setError('Validade inválida.'); return }
    if (card.cvv.length < 3) { setError('CVV inválido.'); return }
    if (!card.name.trim()) { setError('Nome no cartão obrigatório.'); return }

    setError(null)
    setLoading(true)
    try {
      const newDuration  = (booking.duration_hours || 1) + hours
      const newTotal     = (Number(booking.total_price) || 0) + extra

      const { error: upErr } = await supabase
        .from('bookings')
        .update({
          duration_hours: newDuration,
          total_price:    newTotal,
          updated_at:     new Date().toISOString(),
        })
        .eq('id', booking.id)

      if (upErr) throw new Error(upErr.message)

      // Notify provider
      if (booking.provider_id) {
        await supabase.from('notifications').insert({
          user_id:  booking.provider_id,
          title:    'Tempo estendido',
          message:  `O cliente adicionou ${hours}h ao agendamento. Novo total: ${newDuration}h.`,
          type:     'booking_extended',
        })
      }

      setDone(true)
      setTimeout(() => { onSuccess?.(); onClose() }, 2000)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-600" />
            <h2 className="font-bold text-gray-900">Acrescentar Horas</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="font-bold text-gray-900 text-lg">Horas adicionadas!</p>
            <p className="text-sm text-gray-500 mt-1">O profissional foi notificado.</p>
          </div>
        ) : step === 'choose' ? (
          <div className="p-5 space-y-5">
            <p className="text-sm text-gray-600">
              Serviço actual: <strong>{booking.duration_hours}h</strong> · {formatCurrency(rate)}/h
            </p>

            {/* Hours picker */}
            <div>
              <label className="input-label">Horas a adicionar</label>
              <div className="flex items-center justify-center gap-5 mt-2">
                <button
                  onClick={() => setHours((h) => Math.max(1, h - 1))}
                  className="w-11 h-11 rounded-xl border border-gray-200 bg-white font-bold text-gray-700
                             hover:border-primary-400 hover:bg-primary-50 transition-all flex items-center justify-center"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="text-3xl font-extrabold text-gray-900 w-12 text-center">{hours}</span>
                <button
                  onClick={() => setHours((h) => Math.min(8, h + 1))}
                  className="w-11 h-11 rounded-xl border border-gray-200 bg-white font-bold text-gray-700
                             hover:border-primary-400 hover:bg-primary-50 transition-all flex items-center justify-center"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-primary-50 rounded-xl p-4 text-center">
              <p className="text-sm text-primary-700">Valor adicional</p>
              <p className="text-3xl font-extrabold text-primary-600 mt-1">{formatCurrency(extra)}</p>
              <p className="text-xs text-primary-500 mt-1">
                ({formatCurrency(rate)} × {hours}h)
              </p>
            </div>

            <button
              onClick={() => setStep('pay')}
              className="btn-primary w-full py-3"
            >
              Continuar para Pagamento
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between text-sm">
              <span className="text-gray-600">+{hours}h · {formatCurrency(rate)}/h</span>
              <span className="font-bold text-primary-600">{formatCurrency(extra)}</span>
            </div>

            <div>
              <label className="input-label">Número do Cartão</label>
              <input
                type="text"
                inputMode="numeric"
                className="input-field"
                placeholder="1234 5678 9012 3456"
                value={card.number}
                onChange={(e) => setCard((c) => ({ ...c, number: formatCardNumber(e.target.value) }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Validade</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="input-field"
                  placeholder="MM/AA"
                  value={card.expiry}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, '').slice(0, 4)
                    if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`
                    setCard((c) => ({ ...c, expiry: v }))
                  }}
                />
              </div>
              <div>
                <label className="input-label">CVV</label>
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

            <div>
              <label className="input-label">Nome no Cartão</label>
              <input
                type="text"
                className="input-field"
                placeholder="NOME APELIDO"
                value={card.name}
                onChange={(e) => setCard((c) => ({ ...c, name: e.target.value.toUpperCase() }))}
              />
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => { setStep('choose'); setError(null) }}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-200 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handlePay}
                disabled={loading}
                className="flex-1 btn-primary py-3 text-sm disabled:opacity-60"
              >
                {loading ? (
                  <svg className="animate-spin w-4 h-4 mx-auto" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Pagar {formatCurrency(extra)}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
