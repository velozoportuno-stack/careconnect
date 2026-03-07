import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Star, MapPin, Shield, CalendarDays, CreditCard, Clock, BadgeCheck } from 'lucide-react'
import Navbar from '../components/Navbar'
import AvailabilityCalendar from '../components/availability/AvailabilityCalendar'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/appStore'
import { formatCurrency, formatRating } from '../utils/formatters'
import { CLEANING_TYPE_LABELS, SERVICE_TYPE_LABELS } from '../utils/constants'

function getBadgeColor(serviceType) {
  if (['nurse', 'auxiliary_nurse', 'physiotherapist', 'psychologist', 'nutritionist'].includes(serviceType))
    return 'badge-blue'
  if (['caregiver', 'personal_trainer'].includes(serviceType))
    return 'badge-amber'
  if (serviceType === 'cleaner') return 'badge-teal'
  return 'badge-gray'
}

function StarRating({ rating, total }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-4 h-4 ${n <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`}
        />
      ))}
      <span className="text-sm text-gray-600 ml-1 font-medium">{formatRating(rating)}</span>
      <span className="text-sm text-gray-400">({total} avaliações)</span>
    </div>
  )
}

// Get today in YYYY-MM-DD
function today() {
  return new Date().toISOString().split('T')[0]
}

export default function Profile() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { user, setPendingBooking } = useAppStore()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [services, setServices] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  // Booking form state
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [bookingType, setBookingType] = useState('hours') // 'hours' | 'days'
  const [duration, setDuration] = useState(2)
  const [days, setDays] = useState(1)
  const [selectedService, setSelectedService] = useState(null)
  const [address, setAddress]   = useState('')
  const [notes, setNotes]       = useState('')
  const [bookingError, setBookingError] = useState(null)

  useEffect(() => { fetchProfile() }, [id])

  const fetchProfile = async () => {
    const preselectedServiceId = searchParams.get('service')

    const [{ data: prof }, { data: svc }, { data: rev }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase
        .from('provider_services')
        .select('*')
        .eq('provider_id', id)
        .eq('is_available', true)
        .order('created_at', { ascending: true }),
      supabase
        .from('reviews')
        .select('rating, comment, created_at, reviewer:reviewer_id(full_name)')
        .eq('reviewed_id', id)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    // Generate a professional ID on first view if one doesn't exist
    if (prof && prof.role === 'professional' && !prof.professional_id_number) {
      const newId = Math.floor(100000 + Math.random() * 900000)
      await supabase.from('profiles').update({ professional_id_number: newId }).eq('id', id)
      prof.professional_id_number = newId
    }

    setProfile(prof)
    setServices(svc || [])
    setReviews(rev || [])
    if (svc?.length) {
      const match = preselectedServiceId && svc.find((s) => s.id === preselectedServiceId)
      setSelectedService(match ? match.id : svc[0].id)
    }
    setLoading(false)
  }

  const displayRate = () => {
    if (bookingType === 'days') return profile?.daily_rate || 0
    const svc = services.find((s) => s.id === selectedService) || services[0]
    return svc?.price_per_hour || profile?.hourly_rate || 0
  }

  const totalPrice = () => {
    if (bookingType === 'days') return (profile?.daily_rate || 0) * days
    return displayRate() * duration
  }

  const handleBook = () => {
    if (!user) { navigate('/login'); return }
    if (!selectedDate || !selectedTime) {
      setBookingError('Escolhe a data e hora antes de agendar.')
      return
    }
    const svcId = selectedService || (services[0]?.id ?? null)
    const svc = services.find((s) => s.id === svcId) || services[0]
    const rate = displayRate()
    const qty = bookingType === 'days' ? days : duration
    setPendingBooking({
      providerId: id,
      provider: profile,
      serviceId: svcId,
      service: svc,
      date: selectedDate,
      time: selectedTime,
      bookingType,
      duration: bookingType === 'hours' ? duration : qty * 24,
      days: bookingType === 'days' ? days : undefined,
      address,
      notes,
      hourlyRate: bookingType === 'hours' ? rate : undefined,
      dailyRate: bookingType === 'days' ? rate : undefined,
      totalPrice: totalPrice(),
    })
    navigate('/booking')
  }

  const isCarePro = ['caregiver', 'nurse'].includes(profile?.service_type)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }
  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
        <p className="text-gray-500 text-lg">Perfil não encontrado.</p>
        <Link to="/search" className="btn-primary">Voltar à pesquisa</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* ── Left: Provider info ── */}
          <div className="lg:col-span-3 space-y-6">

            {/* Profile card */}
            <div className="card">
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="w-28 h-28 rounded-2xl object-cover shadow-sm"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-2xl bg-primary-100 text-primary-700 font-bold text-3xl
                                    flex items-center justify-center shadow-sm">
                      {profile.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h1 className="text-2xl font-extrabold text-gray-900">{profile.full_name}</h1>
                      <span className={`${getBadgeColor(profile.service_type)} mt-1`}>
                        {SERVICE_TYPE_LABELS[profile.service_type] || profile.custom_profession || 'Profissional'}
                      </span>
                    </div>
                    {profile.is_verified && (
                      <div className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                        <Shield className="w-3.5 h-3.5" />
                        Verificado
                      </div>
                    )}
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <StarRating rating={profile.rating || 0} total={profile.total_reviews || 0} />
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <MapPin className="w-4 h-4" />
                      {profile.city || 'Portugal'}
                    </div>
                    {profile.professional_id_number && (
                      <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-100 text-primary-700 text-sm font-bold px-3 py-1.5 rounded-xl">
                        <BadgeCheck className="w-4 h-4 flex-shrink-0" />
                        🪪 ID do Profissional: {profile.professional_id_number}
                      </div>
                    )}
                  </div>

                  {(profile.hourly_rate || profile.daily_rate) && (
                    <div className="mt-4 flex flex-wrap items-baseline gap-4">
                      {profile.hourly_rate && (
                        <div className="flex items-baseline gap-1">
                          <Clock className="w-4 h-4 text-primary-400 self-center" />
                          <span className="text-2xl font-extrabold text-primary-600">
                            {formatCurrency(profile.hourly_rate)}
                          </span>
                          <span className="text-gray-400 text-sm">/hora</span>
                        </div>
                      )}
                      {profile.daily_rate && (
                        <div className="flex items-baseline gap-1">
                          <CalendarDays className="w-4 h-4 text-primary-400 self-center" />
                          <span className="text-2xl font-extrabold text-primary-600">
                            {formatCurrency(profile.daily_rate)}
                          </span>
                          <span className="text-gray-400 text-sm">/dia</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {profile.bio && (
                <div className="mt-6 pt-5 border-t border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Sobre mim</h2>
                  <p className="text-gray-600 leading-relaxed">{profile.bio}</p>
                </div>
              )}

              {/* Cleaning details */}
              {profile.service_type === 'cleaner' && (profile.cleaning_types?.length || profile.cleaning_description) && (
                <div className="mt-6 pt-5 border-t border-gray-100 space-y-3">
                  {profile.cleaning_types?.length > 0 && (
                    <div>
                      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Serviços oferecidos</h2>
                      <div className="flex flex-wrap gap-2">
                        {profile.cleaning_types.map((type) => (
                          <span key={type} className="badge-teal">
                            {CLEANING_TYPE_LABELS[type] || type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {profile.cleaning_description && (
                    <div>
                      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Descrição</h2>
                      <p className="text-gray-600 leading-relaxed text-sm">{profile.cleaning_description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Services */}
            {services.length > 0 && (
              <div className="card">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Serviços disponíveis</h2>
                <div className="space-y-3">
                  {services.map((svc) => (
                    <label
                      key={svc.id}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all
                                  ${selectedService === svc.id ? 'border-primary-500 bg-primary-50' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="service"
                          className="sr-only"
                          checked={selectedService === svc.id}
                          onChange={() => setSelectedService(svc.id)}
                        />
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                                         ${selectedService === svc.id ? 'border-primary-500' : 'border-gray-300'}`}>
                          {selectedService === svc.id && (
                            <div className="w-2 h-2 rounded-full bg-primary-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{svc.title}</div>
                          {(svc.description || svc.bio) && (
                            <div className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                              {svc.description || svc.bio}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="font-bold text-primary-600 text-sm whitespace-nowrap ml-4">
                        {formatCurrency(svc.price_per_hour)}/h
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Availability calendar */}
            <AvailabilityCalendar
              professionalId={id}
              onSlotSelect={(date, time) => {
                setSelectedDate(date)
                setSelectedTime(time)
                setBookingError(null)
              }}
            />

            {/* Reviews */}
            {reviews.length > 0 && (
              <div className="card">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Avaliações</h2>
                <div className="space-y-4">
                  {reviews.map((r, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold text-xs
                                      flex items-center justify-center flex-shrink-0">
                        {r.reviewer?.full_name?.[0] || '?'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-800">
                            {r.reviewer?.full_name || 'Cliente'}
                          </span>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star key={n} className={`w-3 h-3 ${n <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`} />
                            ))}
                          </div>
                        </div>
                        {r.comment && (
                          <p className="text-sm text-gray-600 mt-1">{r.comment}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Booking calendar ── */}
          <div className="lg:col-span-2">
            <div className="card sticky top-24">
              <div className="flex items-center gap-2 mb-5">
                <CalendarDays className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-bold text-gray-900">Agendar serviço</h2>
              </div>

              <div className="space-y-4">
                {/* Booking type toggle (care pros only) */}
                {isCarePro && profile.daily_rate && profile.hourly_rate && (
                  <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setBookingType('hours')}
                      className={`py-2 rounded-lg text-sm font-semibold transition-all
                        ${bookingType === 'hours' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      ⏱ Por horas
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingType('days')}
                      className={`py-2 rounded-lg text-sm font-semibold transition-all
                        ${bookingType === 'days' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      📅 Por dias
                    </button>
                  </div>
                )}

                {/* Date */}
                <div>
                  <label className="input-label">Data *</label>
                  <input
                    type="date"
                    className="input-field"
                    min={today()}
                    value={selectedDate}
                    onChange={(e) => { setSelectedDate(e.target.value); setBookingError(null) }}
                  />
                </div>

                {/* Time (hours mode only) */}
                {bookingType === 'hours' && (
                  <div>
                    <label className="input-label">Hora de início *</label>
                    <input
                      type="time"
                      className="input-field"
                      value={selectedTime}
                      onChange={(e) => { setSelectedTime(e.target.value); setBookingError(null) }}
                    />
                  </div>
                )}

                {/* Duration (hours) or Days */}
                {bookingType === 'hours' ? (
                  <div>
                    <label className="input-label">Duração (horas)</label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setDuration((d) => Math.max(1, d - 1))}
                        className="w-10 h-10 rounded-xl border border-gray-200 bg-white font-bold text-gray-700
                                   hover:border-primary-400 hover:bg-primary-50 transition-all flex items-center justify-center"
                      >−</button>
                      <span className="text-xl font-bold text-gray-900 w-8 text-center">{duration}</span>
                      <button
                        type="button"
                        onClick={() => setDuration((d) => Math.min(12, d + 1))}
                        className="w-10 h-10 rounded-xl border border-gray-200 bg-white font-bold text-gray-700
                                   hover:border-primary-400 hover:bg-primary-50 transition-all flex items-center justify-center"
                      >+</button>
                      <span className="text-sm text-gray-400">hora{duration !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="input-label">Número de dias</label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setDays((d) => Math.max(1, d - 1))}
                        className="w-10 h-10 rounded-xl border border-gray-200 bg-white font-bold text-gray-700
                                   hover:border-primary-400 hover:bg-primary-50 transition-all flex items-center justify-center"
                      >−</button>
                      <span className="text-xl font-bold text-gray-900 w-8 text-center">{days}</span>
                      <button
                        type="button"
                        onClick={() => setDays((d) => Math.min(30, d + 1))}
                        className="w-10 h-10 rounded-xl border border-gray-200 bg-white font-bold text-gray-700
                                   hover:border-primary-400 hover:bg-primary-50 transition-all flex items-center justify-center"
                      >+</button>
                      <span className="text-sm text-gray-400">dia{days !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                )}

                {/* Address */}
                <div>
                  <label className="input-label">Morada do serviço</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Rua, número, cidade..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="input-label">Notas adicionais</label>
                  <textarea
                    rows={3}
                    className="input-field resize-none text-sm"
                    placeholder="Informação especial para o profissional..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* Price summary */}
                {(displayRate() > 0) && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      {bookingType === 'days'
                        ? <span>{formatCurrency(displayRate())} × {days} dia{days !== 1 ? 's' : ''}</span>
                        : <span>{formatCurrency(displayRate())} × {duration}h</span>
                      }
                      <span className="font-medium">{formatCurrency(totalPrice())}</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2 mt-2">
                      <span>Total estimado</span>
                      <span className="text-primary-600">{formatCurrency(totalPrice())}</span>
                    </div>
                  </div>
                )}

                {bookingError && (
                  <p className="text-red-500 text-sm">{bookingError}</p>
                )}

                <button
                  onClick={handleBook}
                  className="btn-primary w-full text-base py-4"
                >
                  <CreditCard className="w-5 h-5" />
                  Agendar e Pagar
                </button>

                {!user && (
                  <p className="text-center text-xs text-gray-400">
                    Necessitas de{' '}
                    <Link to="/login" className="text-primary-600 font-semibold hover:underline">
                      entrar
                    </Link>
                    {' '}para agendar.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
