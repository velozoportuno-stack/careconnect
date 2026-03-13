import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import {
  CalendarDays, CheckCircle2, Clock, MapPin,
  Search, ChevronDown, ChevronUp, Plus, Briefcase, Navigation,
  Settings, PlusCircle, Star, CheckCheck, X, AlertTriangle,
} from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { useAuth } from '../hooks/useAuth'
import { useBookings } from '../hooks/useBookings'
import { supabase } from '../lib/supabase'
import { formatDate, formatCurrency } from '../utils/formatters'
import ClientTrackingView from '../components/maps/ClientTrackingView'
import ProviderLocationShare from '../components/maps/ProviderLocationShare'
import MedicationAlarms from '../components/dashboard/MedicationAlarms'
import AddHoursModal from '../components/dashboard/AddHoursModal'
import ServiceManager from '../components/dashboard/ServiceManager'

/* ── Rating Modal ── */
function RatingModal({ booking, reviewerRole, onClose, onSubmit, loading }) {
  const [rating, setRating]   = useState(0)
  const [comment, setComment] = useState('')
  const isProvider    = reviewerRole === 'professional'
  const reviewedName  = isProvider ? booking.client?.full_name : booking.provider?.full_name
  const title         = isProvider ? 'Como foi o cliente?' : 'Como foi o serviço?'
  const subtitle      = isProvider ? 'Avalia o comportamento e comunicação do cliente.' : 'Avalia o profissional que te prestou serviço.'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-5">
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          {reviewedName && <p className="text-sm font-medium text-primary-600 mt-0.5">{reviewedName}</p>}
          <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        </div>

        {/* Star picker */}
        <div className="flex justify-center gap-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className="transition-transform hover:scale-110 active:scale-95"
            >
              <Star className={`w-10 h-10 ${n <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`} />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-center text-sm font-semibold text-amber-600">
            {['', 'Mau', 'Razoável', 'Bom', 'Muito bom', 'Excelente'][rating]}
          </p>
        )}

        <textarea
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none
                     focus:outline-none focus:ring-2 focus:ring-primary-300 placeholder-gray-300"
          placeholder="Comentário opcional..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold
                       text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Mais tarde
          </button>
          <button
            onClick={() => onSubmit(rating, comment)}
            disabled={loading || rating === 0}
            className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white
                       text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Star className="w-4 h-4" />
                Enviar Avaliação
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Cancel Confirmation Modal ── */
function CancelModal({ booking, cancellerRole, onBack, onConfirm, loading }) {
  const isProvider = cancellerRole === 'professional'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {isProvider ? 'Cancelar Serviço' : 'Cancelar Reserva'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {isProvider
                ? 'Tens a certeza que queres cancelar este serviço? O cliente será notificado.'
                : 'Tens a certeza que queres cancelar esta reserva?'}
            </p>
          </div>
        </div>

        {booking && (
          <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
            <p className="font-semibold text-gray-800">
              {booking.service?.title || 'Serviço agendado'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isProvider
                ? `Cliente: ${booking.client?.full_name}`
                : `Profissional: ${booking.provider?.full_name}`}{' '}
              · {formatDate(booking.scheduled_date)}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onBack}
            disabled={loading}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold
                       text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Voltar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white
                       text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <X className="w-4 h-4" />}
            Confirmar Cancelamento
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Finish Service Confirmation Modal ── */
function FinishServiceModal({ booking, onCancel, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <CheckCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Concluir Serviço</h3>
            <p className="text-sm text-gray-500 mt-1">
              Tens a certeza que queres concluir este serviço? O pagamento será libertado para a tua conta.
            </p>
          </div>
        </div>

        {booking && (
          <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
            <p className="font-semibold text-gray-800">
              {booking.service?.title || 'Serviço agendado'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Cliente: {booking.client?.full_name} · {formatDate(booking.scheduled_date)}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold
                       text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white
                       text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>✅ Confirmar Conclusão</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

const STATUS_LABELS = {
  pending:                   { label: '🟡 Pendente',                    css: 'status-pending' },
  confirmed:                 { label: '🟢 Confirmado',                  css: 'status-confirmed' },
  in_progress:               { label: '🔵 Em andamento',               css: 'status-in_progress' },
  completed:                 { label: '✅ Concluído',                   css: 'status-completed' },
  cancelled:                 { label: '❌ Cancelado',                   css: 'status-cancelled' },
  cancelled_by_client:       { label: '❌ Cancelado pelo cliente',      css: 'status-cancelled' },
  cancelled_by_professional: { label: '❌ Cancelado pelo profissional', css: 'status-cancelled' },
}

const ROLE_LABEL = {
  client:       'Cliente',
  professional: 'Profissional',
  admin:        'Administrador',
}

const TRACKING_STATUSES      = new Set(['confirmed', 'in_progress', 'completed'])
const CARE_ROLES             = new Set(['caregiver', 'nurse'])
const ACTIVE_STATUSES        = new Set(['confirmed', 'in_progress'])
const CANCELLABLE_STATUSES   = new Set(['pending', 'confirmed'])

function StatCard({ icon: Icon, value, label, color = 'text-primary-600', bg = 'bg-primary-50' }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
}

function BookingRow({ booking, userRole, userId, isExpanded, onToggle, onAddHours, onRefresh, onFinishService, onCancelService }) {
  const s = STATUS_LABELS[booking.status] || STATUS_LABELS.pending
  const hasTracking = TRACKING_STATUSES.has(booking.status)
  const isProvider  = userRole === 'professional'
  const isActive    = ACTIVE_STATUSES.has(booking.status)
  const canCancel   = CANCELLABLE_STATUSES.has(booking.status)
  // hasCare: show medication alarms if the booked service is care-type
  const providerServiceType = booking.provider?.service_type
  const hasCare = CARE_ROLES.has(providerServiceType)

  const otherParty  = isProvider ? booking.client : booking.provider

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white">
      <div
        className={`flex items-start gap-4 p-5 ${hasTracking ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
        onClick={() => hasTracking && onToggle(booking.id)}
      >
        {/* Provider avatar (shown to client) */}
        {!isProvider && booking.provider && (
          <div className="flex-shrink-0">
            {booking.provider.avatar_url ? (
              <img
                src={booking.provider.avatar_url}
                alt={booking.provider.full_name}
                className="w-14 h-14 rounded-2xl object-cover shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-primary-100 text-primary-700 font-bold text-lg
                              flex items-center justify-center shadow-sm">
                {booking.provider.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
            )}
          </div>
        )}

        {/* Date column (for provider view) */}
        {isProvider && (
          <div className="flex-shrink-0 text-center bg-primary-50 rounded-xl px-3 py-2 min-w-[56px]">
            <div className="text-xs font-medium text-primary-500 uppercase">
              {new Date(booking.scheduled_date).toLocaleDateString('pt-PT', { month: 'short' })}
            </div>
            <div className="text-2xl font-extrabold text-primary-700 leading-none">
              {new Date(booking.scheduled_date).getDate()}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              {!isProvider && (
                <p className="font-bold text-gray-900 text-base">
                  {booking.provider?.full_name || 'Profissional'}
                </p>
              )}
              <p className={`${isProvider ? 'font-bold text-gray-900' : 'text-sm text-primary-600 font-medium'}`}>
                {booking.service?.title || (isProvider ? 'Serviço agendado' : 'Serviço')}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {isProvider && otherParty ? `Cliente: ${otherParty.full_name} · ` : ''}
                {formatDate(booking.scheduled_date)} às {booking.scheduled_time?.slice(0, 5)}
                {booking.duration_hours && ` · ${booking.duration_hours}h`}
              </p>
              {!isProvider && (booking.provider?.average_rating > 0 || booking.provider?.rating > 0) && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-semibold text-gray-600">
                    {Number(booking.provider.average_rating || booking.provider.rating).toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-400">({booking.provider.total_reviews})</span>
                </div>
              )}
              {booking.address && (
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                  <MapPin className="w-3 h-3" />
                  {booking.address}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <span className={s.css}>{s.label}</span>
              {booking.total_price && (
                <span className="text-sm font-bold text-primary-600">
                  {formatCurrency(booking.total_price)}
                </span>
              )}
            </div>
          </div>

          {/* GPS indicator */}
          {booking.status === 'in_progress' && (
            <div className="flex items-center gap-1 mt-2 text-xs text-primary-600 font-medium">
              <Navigation className="w-3 h-3 animate-pulse" />
              {isProvider ? 'Partilha de localização activa' : 'A seguir localização em tempo real'}
            </div>
          )}

          {/* Action buttons */}
          {((!isProvider && isActive) || (isProvider && isActive) || canCancel) && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {/* Add hours — client only, active bookings */}
              {!isProvider && isActive && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAddHours(booking) }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary-600
                             bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Acrescentar horas
                </button>
              )}
              {/* Finish service — provider only, confirmed or in_progress */}
              {isProvider && isActive && (
                <button
                  onClick={(e) => { e.stopPropagation(); onFinishService(booking) }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white
                             bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  ✅ Concluir Serviço
                </button>
              )}
              {/* Cancel — provider on pending/confirmed */}
              {isProvider && canCancel && (
                <button
                  onClick={(e) => { e.stopPropagation(); onCancelService(booking) }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-600
                             bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  ❌ Cancelar Serviço
                </button>
              )}
              {/* Cancel — client on pending/confirmed */}
              {!isProvider && canCancel && (
                <button
                  onClick={(e) => { e.stopPropagation(); onCancelService(booking) }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-600
                             bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  ❌ Cancelar Reserva
                </button>
              )}
            </div>
          )}
        </div>

        {hasTracking && (
          <div className="flex-shrink-0 text-gray-400">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        )}
      </div>

      {/* Tracking panel */}
      {hasTracking && isExpanded && (
        <div className="border-t border-gray-100 p-5 bg-gray-50 space-y-4">
          {userRole === 'client' ? (
            <ClientTrackingView booking={booking} />
          ) : (
            <ProviderLocationShare booking={booking} providerId={userId} />
          )}

          {/* Medication alarms for care bookings */}
          {hasCare && (
            <MedicationAlarms
              bookingId={booking.id}
              isProvider={isProvider}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { user, userRole, addNotification } = useAppStore()
  const { signOut } = useAuth()
  const { bookings, fetchBookings, loading } = useBookings()
  const navigate = useNavigate()
  const [expandedId, setExpandedId]           = useState(null)
  const [filter, setFilter]                   = useState('all')
  const [addHoursBooking, setAddHoursBooking] = useState(null)
  const [finishBooking, setFinishBooking]     = useState(null)
  const [finishLoading, setFinishLoading]     = useState(false)
  const [successMsg, setSuccessMsg]           = useState(null)
  const [ratingBooking, setRatingBooking]     = useState(null)
  const [ratingLoading, setRatingLoading]     = useState(false)
  const [profRating, setProfRating]           = useState(null)
  const [cancelTarget, setCancelTarget]       = useState(null)
  const [cancelLoading, setCancelLoading]     = useState(false)
  const [weeklyData, setWeeklyData]           = useState(null)
  const [profCountry, setProfCountry]         = useState('PT')

  // Derive isProvider early — must be before any useEffect that references it
  const isProvider = userRole === 'professional'

  useEffect(() => { fetchBookings() }, [])

  // Fetch professional's own average rating + country
  useEffect(() => {
    if (!isProvider || !user) return
    supabase.from('profiles').select('average_rating, total_reviews, country').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.total_reviews > 0) setProfRating(data.average_rating)
        if (data?.country) setProfCountry(data.country)
      })
  }, [isProvider, user])

  // Fetch weekly earnings for professionals
  useEffect(() => {
    if (!isProvider || !user) return

    const now = new Date()
    const dow = now.getDay() // 0=Sun
    const diffToMon = dow === 0 ? -6 : 1 - dow
    const monday = new Date(now)
    monday.setDate(now.getDate() + diffToMon)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    // Fetch ALL completed bookings (no DB-side date filter) — completed_at may be
    // null for older bookings; fall back to updated_at then scheduled_date in JS.
    supabase
      .from('bookings')
      .select('completed_at, updated_at, scheduled_date, total_price')
      .eq('provider_id', user.id)
      .eq('status', 'completed')
      .then(({ data }) => {
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(monday)
          d.setDate(monday.getDate() + i)
          return { date: d, count: 0, total: 0 }
        })
        for (const b of (data || [])) {
          // completed_at → updated_at → scheduled_date
          const dateStr = b.completed_at || b.updated_at || b.scheduled_date
          if (!dateStr) continue
          const d = new Date(dateStr)
          if (d < monday || d > sunday) continue
          const idx = d.getDay() === 0 ? 6 : d.getDay() - 1 // Mon=0 … Sun=6
          days[idx].count++
          days[idx].total += parseFloat(b.total_price || 0)
        }
        setWeeklyData(days)
      })
  }, [isProvider, user])

  // Provider: subscribe to client-initiated cancellations via Supabase Realtime
  useEffect(() => {
    if (!user || !isProvider) return
    const channel = supabase
      .channel(`provider-bookings-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'bookings',
        filter: `provider_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.new?.status === 'cancelled' && payload.new?.cancelled_by === 'client') {
          addNotification({ id: Date.now(), message: 'O cliente cancelou a reserva.', type: 'error' })
          fetchBookings()
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, isProvider])

  // Client: subscribe to booking completions and cancellations via Supabase Realtime
  useEffect(() => {
    if (!user || isProvider) return
    const channel = supabase
      .channel(`client-bookings-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `client_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new?.status === 'completed') {
            addNotification({
              id: Date.now(),
              message: 'O seu serviço foi finalizado! Avalia o profissional.',
              type: 'success',
            })
            fetchBookings().then(() => {
              const completed = (bookings || []).find((b) => b.id === payload.new.id)
              if (completed) setRatingBooking({ ...completed, reviewerRole: 'client' })
            })
          }
          if (payload.new?.status === 'cancelled' && payload.new?.cancelled_by === 'professional') {
            addNotification({
              id: Date.now(),
              message: 'O profissional cancelou o serviço. O reembolso será processado em breve.',
              type: 'error',
            })
            fetchBookings()
          }
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, isProvider])

  const handleFinishService = useCallback(async () => {
    if (!finishBooking) return
    setFinishLoading(true)
    const snapshot = finishBooking  // save reference before clearing
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'completed', payment_status: 'released', completed_at: now })
      .eq('id', finishBooking.id)

    setFinishLoading(false)
    setFinishBooking(null)

    if (error) {
      setSuccessMsg({ type: 'error', text: 'Erro ao finalizar o serviço. Tenta novamente.' })
      setTimeout(() => setSuccessMsg(null), 6000)
    } else {
      fetchBookings()
      // Provider rates the client immediately after finishing
      setRatingBooking({ ...snapshot, reviewerRole: 'professional' })
    }
  }, [finishBooking, fetchBookings])

  const submitRating = useCallback(async (rating, comment) => {
    if (!ratingBooking || rating === 0) return
    setRatingLoading(true)
    const isProviderReviewer = ratingBooking.reviewerRole === 'professional'
    const reviewedId = isProviderReviewer ? ratingBooking.client_id : ratingBooking.provider_id
    try {
      const { error: reviewErr } = await supabase.from('reviews').insert({
        reviewer_id: user.id,
        reviewed_id: reviewedId,
        booking_id:  ratingBooking.id,
        rating,
        comment:     comment.trim() || null,
      })
      if (reviewErr) throw reviewErr

      // Recalculate average_rating and total_reviews for the reviewed profile
      const { data: allReviews } = await supabase
        .from('reviews').select('rating').eq('reviewed_id', reviewedId)
      if (allReviews?.length) {
        const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
        await supabase.from('profiles').update({
          average_rating: parseFloat(avg.toFixed(2)),
          total_reviews:  allReviews.length,
        }).eq('id', reviewedId)
      }
      setRatingBooking(null)
      setSuccessMsg({ type: 'success', text: 'Avaliação enviada com sucesso! Obrigado.' })
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch {
      setSuccessMsg({ type: 'error', text: 'Erro ao enviar avaliação. Tenta novamente.' })
      setTimeout(() => setSuccessMsg(null), 4000)
    } finally {
      setRatingLoading(false)
    }
  }, [ratingBooking, user])

  const handleCancelBooking = useCallback(async () => {
    if (!cancelTarget) return
    setCancelLoading(true)
    const cancelledBy = isProvider ? 'professional' : 'client'
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: cancelledBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cancelTarget.id)
    if (error) {
      console.error('[Cancel] Supabase error:', error)
    }
    setCancelLoading(false)
    setCancelTarget(null)
    if (error) {
      setSuccessMsg({ type: 'error', text: 'Erro ao cancelar. Tenta novamente.' })
    } else {
      const msg = isProvider ? 'Serviço cancelado.' : 'Reserva cancelada com sucesso.'
      setSuccessMsg({ type: 'success', text: msg })
      fetchBookings()
    }
    setTimeout(() => setSuccessMsg(null), 5000)
  }, [cancelTarget, isProvider, fetchBookings])

  const CANCELLED_STATUSES = ['cancelled', 'cancelled_by_client', 'cancelled_by_professional']
  const filteredBookings = (bookings || []).filter((b) => {
    if (filter === 'all')       return true
    if (filter === 'active')    return ['pending', 'confirmed', 'in_progress'].includes(b.status)
    if (filter === 'done')      return b.status === 'completed'
    if (filter === 'cancelled') return CANCELLED_STATUSES.includes(b.status)
    return true
  })

  const completedCount = (bookings || []).filter((b) => b.status === 'completed').length
  const activeCount    = (bookings || []).filter((b) => ['pending', 'confirmed', 'in_progress'].includes(b.status)).length

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Utilizador'

  // Show spinner while auth session + role are being resolved
  if (!user || userRole === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">A carregar o teu painel...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Welcome ── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              Olá, {firstName}!
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-500">
                {isProvider ? 'Painel do profissional' : 'Os meus agendamentos'}
              </span>
              {userRole && (
                <span className="badge-teal text-xs">
                  {ROLE_LABEL[userRole] || userRole}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isProvider && (
              <Link
                to="/edit-profile"
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl
                           text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Editar perfil
              </Link>
            )}
            {!isProvider && (
              <Link to="/search" className="btn-primary text-sm">
                <Plus className="w-4 h-4" />
                Novo agendamento
              </Link>
            )}
          </div>
        </div>

        {/* ── Stats ── */}
        <div className={`grid grid-cols-1 gap-4 mb-8 ${isProvider && profRating ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
          <StatCard
            icon={CalendarDays}
            value={bookings.length}
            label="Total de agendamentos"
          />
          <StatCard
            icon={Clock}
            value={activeCount}
            label="Activos / Pendentes"
            color="text-amber-600"
            bg="bg-amber-50"
          />
          <StatCard
            icon={CheckCircle2}
            value={completedCount}
            label="Concluídos"
            color="text-emerald-600"
            bg="bg-emerald-50"
          />
          {isProvider && profRating && (
            <StatCard
              icon={Star}
              value={`⭐ ${Number(profRating).toFixed(1)}`}
              label="Minha avaliação"
              color="text-amber-600"
              bg="bg-amber-50"
            />
          )}
        </div>

        {/* ── Service Manager (providers only) ── */}
        {isProvider && <ServiceManager />}

        {/* ── Weekly Earnings (providers only) ── */}
        {isProvider && weeklyData && (() => {
          const curr = profCountry === 'BR' ? 'R$' : '€'
          const DAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
          const weekTotal = weeklyData.reduce((s, d) => s + d.total, 0)
          const today = new Date()
          const todayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1

          return (
            <div className="card mb-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-gray-900">Faturamento</h2>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  Esta semana
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                      <th className="text-left py-2 pr-4 font-semibold">Dia</th>
                      <th className="text-center py-2 px-4 font-semibold">Serviços</th>
                      <th className="text-right py-2 pl-4 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyData.map((row, i) => {
                      const isToday = i === todayIdx
                      return (
                        <tr
                          key={i}
                          className={`border-b border-gray-50 transition-colors
                            ${isToday ? 'bg-emerald-50' : row.count > 0 ? 'bg-white' : ''}`}
                        >
                          <td className="py-2.5 pr-4">
                            <span className={`font-medium ${isToday ? 'text-emerald-700' : 'text-gray-700'}`}>
                              {DAY_NAMES[i]}
                            </span>
                            {isToday && (
                              <span className="ml-2 text-xs font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                                hoje
                              </span>
                            )}
                          </td>
                          <td className="text-center py-2.5 px-4">
                            {row.count > 0 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full
                                               bg-emerald-100 text-emerald-700 text-xs font-bold">
                                {row.count}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className={`text-right py-2.5 pl-4 font-semibold
                                          ${row.total > 0 ? 'text-emerald-700' : 'text-gray-300'}`}>
                            {row.total > 0 ? `${curr} ${row.total.toFixed(2)}` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200">
                      <td className="pt-3 pr-4 text-sm font-bold text-gray-900">Total da semana</td>
                      <td className="text-center pt-3 px-4 text-sm font-bold text-gray-700">
                        {weeklyData.reduce((s, d) => s + d.count, 0)}
                      </td>
                      <td className="text-right pt-3 pl-4 text-base font-extrabold text-emerald-700">
                        {curr} {weekTotal.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {weekTotal === 0 && (
                <p className="text-center text-sm text-gray-400 mt-4">
                  Nenhum serviço concluído esta semana.
                </p>
              )}
            </div>
          )
        })()}

        {/* ── Bookings panel ── */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900">Agendamentos</h2>

            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {[
                { key: 'all',       label: 'Todos' },
                { key: 'active',    label: 'Activos' },
                { key: 'done',      label: 'Concluídos' },
                { key: 'cancelled', label: 'Cancelados' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                              ${filter === f.key
                                ? 'bg-white shadow-sm text-primary-600'
                                : 'text-gray-500 hover:text-gray-700'
                              }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border border-gray-100 rounded-2xl p-5 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                      <div className="h-3 bg-gray-200 rounded w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-16">
              {isProvider ? (
                <>
                  <Briefcase className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Ainda não tens agendamentos.</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Quando um cliente agendar um serviço contigo, aparecerá aqui.
                  </p>
                </>
              ) : (
                <>
                  <CalendarDays className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Nenhum agendamento encontrado.</p>
                  <Link
                    to="/search"
                    className="inline-flex items-center gap-2 mt-4 btn-primary text-sm"
                  >
                    <Search className="w-4 h-4" />
                    Encontrar profissional
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBookings.map((booking) => (
                <BookingRow
                  key={booking.id}
                  booking={booking}
                  userRole={userRole}
                  userId={user?.id}
                  isExpanded={expandedId === booking.id}
                  onToggle={(id) => setExpandedId((prev) => (prev === id ? null : id))}
                  onAddHours={(b) => setAddHoursBooking(b)}
                  onRefresh={fetchBookings}
                  onFinishService={(b) => setFinishBooking(b)}
                  onCancelService={(b) => setCancelTarget(b)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Hours Modal */}
      {addHoursBooking && (
        <AddHoursModal
          booking={addHoursBooking}
          onClose={() => setAddHoursBooking(null)}
          onSuccess={fetchBookings}
        />
      )}

      {/* Finish Service Modal */}
      {finishBooking && (
        <FinishServiceModal
          booking={finishBooking}
          onCancel={() => setFinishBooking(null)}
          onConfirm={handleFinishService}
          loading={finishLoading}
        />
      )}

      {/* Cancel Modal */}
      {cancelTarget && (
        <CancelModal
          booking={cancelTarget}
          cancellerRole={userRole}
          onBack={() => setCancelTarget(null)}
          onConfirm={handleCancelBooking}
          loading={cancelLoading}
        />
      )}

      {/* Rating Modal — shown after service completion for both parties */}
      {ratingBooking && (
        <RatingModal
          booking={ratingBooking}
          reviewerRole={ratingBooking.reviewerRole}
          onClose={() => setRatingBooking(null)}
          onSubmit={submitRating}
          loading={ratingLoading}
        />
      )}

      {/* Success / Error toast */}
      {successMsg && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-4
                         rounded-2xl shadow-xl text-sm font-semibold max-w-sm w-full
                         ${successMsg.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'}`}>
          {successMsg.type === 'success'
            ? <CheckCheck className="w-5 h-5 flex-shrink-0" />
            : <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          }
          <span>{successMsg.text}</span>
          <button onClick={() => setSuccessMsg(null)} className="ml-auto opacity-80 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
