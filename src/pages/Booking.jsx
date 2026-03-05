import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Calendar, Clock, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/appStore'
import { useBookings } from '../hooks/useBookings'
import { formatCurrency } from '../utils/formatters'

export default function Booking() {
  const [searchParams] = useSearchParams()
  const providerId = searchParams.get('provider')
  const serviceId = searchParams.get('service')
  const navigate = useNavigate()
  const { user } = useAppStore()
  const { createBooking, loading } = useBookings()
  const [provider, setProvider] = useState(null)
  const [service, setService] = useState(null)
  const [success, setSuccess] = useState(false)
  const { register, handleSubmit, watch, formState: { errors } } = useForm()

  useEffect(() => {
    if (!user) navigate('/login')
    fetchData()
  }, [])

  const fetchData = async () => {
    if (providerId) {
      const { data } = await supabase.from('profiles').select('*').eq('id', providerId).single()
      setProvider(data)
    }
    if (serviceId) {
      const { data } = await supabase.from('services').select('*').eq('id', serviceId).single()
      setService(data)
    }
  }

  const hours = watch('duration_hours', 1)
  const rate = service?.price_per_hour || provider?.hourly_rate || 0
  const total = hours * rate

  const onSubmit = async ({ scheduled_date, scheduled_time, duration_hours, address, notes }) => {
    const { data, error } = await createBooking({
      provider_id: providerId,
      service_id: serviceId || null,
      scheduled_date,
      scheduled_time,
      duration_hours: Number(duration_hours),
      total_price: total,
      address,
      notes,
    })
    if (!error) {
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 2000)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="card text-center max-w-md">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Agendamento Criado!</h2>
          <p className="text-gray-500">A redirecionar para o dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold text-primary-600">CareConnect</Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">Novo Agendamento</h1>

        {provider && (
          <div className="card mb-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">👤</div>
            <div>
              <p className="font-semibold">{provider.full_name}</p>
              {service && <p className="text-sm text-gray-500">{service.title}</p>}
              {rate > 0 && <p className="text-primary-600 font-medium">{formatCurrency(rate)}/h</p>}
            </div>
          </div>
        )}

        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline w-4 h-4 mr-1" />Data
              </label>
              <input
                type="date"
                className="input-field"
                min={new Date().toISOString().split('T')[0]}
                {...register('scheduled_date', { required: 'Data obrigatória' })}
              />
              {errors.scheduled_date && <p className="text-red-500 text-xs mt-1">{errors.scheduled_date.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="inline w-4 h-4 mr-1" />Horário
              </label>
              <input
                type="time"
                className="input-field"
                {...register('scheduled_time', { required: 'Horário obrigatório' })}
              />
              {errors.scheduled_time && <p className="text-red-500 text-xs mt-1">{errors.scheduled_time.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duração (horas)</label>
              <input
                type="number"
                min="1" max="12"
                className="input-field"
                {...register('duration_hours', { required: true, min: 1, max: 12 })}
                defaultValue={1}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="inline w-4 h-4 mr-1" />Morada
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Rua, número, cidade"
                {...register('address', { required: 'Morada obrigatória' })}
              />
              {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Informações adicionais para o cuidador..."
                {...register('notes')}
              />
            </div>

            {total > 0 && (
              <div className="p-4 bg-primary-50 rounded-lg flex items-center justify-between">
                <span className="font-medium text-gray-700">Total estimado</span>
                <span className="text-xl font-bold text-primary-600">{formatCurrency(total)}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-60">
              {loading ? 'A criar agendamento...' : 'Confirmar Agendamento'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
