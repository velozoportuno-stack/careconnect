import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import {
  CalendarDays, CheckCircle2, Clock, MapPin,
  Search, ChevronDown, ChevronUp, Plus, Briefcase, Navigation,
  Settings, PlusCircle, Star, CheckCheck, X, AlertTriangle, ExternalLink,
} from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { useAuth } from '../hooks/useAuth'
import { useStripeConnect } from '../hooks/useStripeConnect'
import { useBookings } from '../hooks/useBookings'
import { supabase } from '../lib/supabase'
import { formatDate, formatCurrency } from '../utils/formatters'
import ClientTrackingView from '../components/maps/ClientTrackingView'
import ProviderLocationShare from '../components/maps/ProviderLocationShare'
import MedicationAlarms from '../components/dashboard/MedicationAlarms'
import AddHoursModal from '../components/dashboard/AddHoursModal'
import ServiceManager from '../components/dashboard/ServiceManager'
import PatientManager from '../components/dashboard/PatientManager'

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
// CARE_ROLES: bookings with these service types show MedicationAlarms in the booking row
const CARE_ROLES             = new Set(['caregiver', 'nurse', 'auxiliary_nurse'])
// PATIENT_CARE_ROLES: professionals with these service types get the Pacientes tab
const PATIENT_CARE_ROLES     = new Set(['caregiver', 'nurse', 'auxiliary_nurse'])
const ACTIVE_STATUSES        = new Set(['confirmed', 'in_progress'])
const CANCELLABLE_STATUSES   = new Set(['pending', 'confirmed'])

// ── Haversine distance (meters) ───────────────────────────────────────────────
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── BookingPatientPanel ───────────────────────────────────────────────────────
// PROTECTED — DO NOT REMOVE
// Shows patient data linked to a specific booking (Feature 3 — professional view)
function BookingPatientPanel({ bookingId }) {
  const [patient,     setPatient]     = useState(null)
  const [medications, setMedications] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [notes,       setNotes]       = useState('')
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)

  useEffect(() => {
    if (!bookingId) return
    let cancelled = false
    async function load() {
      const { data: p } = await supabase
        .from('patients').select('*').eq('booking_id', bookingId).maybeSingle()
      if (cancelled) return
      if (p) {
        setPatient(p)
        const { data: meds } = await supabase
          .from('patient_medications').select('*').eq('patient_id', p.id)
        if (!cancelled) setMedications(meds || [])
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [bookingId])

  const saveNotes = async () => {
    setSaving(true)
    await supabase.from('bookings').update({ notes }).eq('id', bookingId)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
  return (
    <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-3">
      <p className="text-sm font-bold text-gray-900">🏥 Dados do Paciente</p>
      {!patient ? (
        <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          O cliente ainda não preencheu os dados do paciente.
        </p>
      ) : (
        <div className="space-y-1.5 text-sm text-gray-700">
          <p><span className="font-medium text-gray-500">Nome:</span> {patient.name}</p>
          {patient.date_of_birth && (
            <p><span className="font-medium text-gray-500">Nascimento:</span> {new Date(patient.date_of_birth).toLocaleDateString('pt-PT')}</p>
          )}
          {patient.medical_conditions && (
            <p><span className="font-medium text-gray-500">Condições:</span> {patient.medical_conditions}</p>
          )}
          {patient.allergies && (
            <p><span className="font-medium text-gray-500">Alergias:</span> {patient.allergies}</p>
          )}
          {patient.observations && (
            <p><span className="font-medium text-gray-500">Observações:</span> {patient.observations}</p>
          )}
          {medications.length > 0 && (
            <div className="pt-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Medicação</p>
              <div className="space-y-0.5">
                {medications.map((m) => (
                  <p key={m.id}>💊 {m.name} — {m.dosage} — {m.frequency}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notas da visita</p>
        <textarea
          rows={2}
          className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
          placeholder="Adicionar notas sobre esta visita..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button
          onClick={saveNotes}
          disabled={saving || !notes.trim()}
          className="mt-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
        >
          {saving ? 'A guardar...' : saved ? '✓ Guardado' : 'Guardar notas'}
        </button>
      </div>
    </div>
  )
}

// ── BookingServicePanel ───────────────────────────────────────────────────────
// PROTECTED — DO NOT REMOVE
// Shows service details + professional notes for non-care bookings (Feature 3)
function BookingServicePanel({ booking }) {
  const [notes,  setNotes]  = useState(booking.notes || '')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  const save = async () => {
    setSaving(true)
    await supabase.from('bookings').update({ notes }).eq('id', booking.id)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-3">
      <p className="text-sm font-bold text-gray-900">🔧 Detalhes do Serviço</p>
      <div className="space-y-1.5 text-sm text-gray-700">
        {booking.service?.title && (
          <p><span className="font-medium text-gray-500">Serviço:</span> {booking.service.title}</p>
        )}
        {booking.duration_hours && (
          <p><span className="font-medium text-gray-500">Duração:</span> {booking.duration_hours}h</p>
        )}
        {booking.client_notes ? (
          <p><span className="font-medium text-gray-500">Observações do cliente:</span> {booking.client_notes}</p>
        ) : (
          <p className="italic text-gray-400">Sem observações do cliente.</p>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notas da visita</p>
        <textarea
          rows={2}
          className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
          placeholder="Adicionar notas sobre esta visita..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button
          onClick={save}
          disabled={saving || !notes.trim()}
          className="mt-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
        >
          {saving ? 'A guardar...' : saved ? '✓ Guardado' : 'Guardar notas'}
        </button>
      </div>
    </div>
  )
}

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

function BookingRow({ booking, userRole, userId, isExpanded, onToggle, onAddHours, onRefresh, onFinishService, onCancelService, unreadCount, onOpenChat }) {
  const s = STATUS_LABELS[booking.status] || STATUS_LABELS.pending
  const hasTracking = TRACKING_STATUSES.has(booking.status)
  const isProvider  = userRole === 'professional'
  const isActive    = ACTIVE_STATUSES.has(booking.status)
  const canCancel   = CANCELLABLE_STATUSES.has(booking.status)
  // hasCare: show medication alarms if the booked service is care-type
  const providerServiceType = booking.provider?.service_type
  const hasCare = CARE_ROLES.has(providerServiceType)

  const otherParty  = isProvider ? booking.client : booking.provider

  // Feature 2: GPS proximity for "Iniciar Serviço"
  const [providerPos,      setProviderPos]      = useState(null)
  const [startingService,  setStartingService]  = useState(false)
  // Feature 2: Elapsed timer for in_progress bookings
  const [elapsedMs,        setElapsedMs]        = useState(0)

  // Watch provider GPS when confirmed booking with client coordinates
  useEffect(() => {
    if (!isProvider || booking.status !== 'confirmed') return
    if (!booking.client_latitude || !booking.client_longitude) return
    if (!navigator.geolocation) return
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setProviderPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [isProvider, booking.status, booking.client_latitude, booking.client_longitude])

  // Elapsed timer — uses started_at when available, falls back to updated_at
  // Ticks every 10s so the countdown stays responsive
  useEffect(() => {
    if (booking.status !== 'in_progress') return
    const startTime = new Date(booking.started_at || booking.updated_at).getTime()
    const tick = () => setElapsedMs(Date.now() - startTime)
    tick()
    const id = setInterval(tick, 10000)
    return () => clearInterval(id)
  }, [booking.status, booking.started_at, booking.updated_at])

  const distToClient = providerPos && booking.client_latitude && booking.client_longitude
    ? haversineMeters(
        providerPos.lat, providerPos.lng,
        parseFloat(booking.client_latitude), parseFloat(booking.client_longitude)
      )
    : null
  const nearClient = distToClient !== null && distToClient <= 200

  const handleStartService = async (e) => {
    e.stopPropagation()
    setStartingService(true)
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'in_progress', started_at: now, updated_at: now })
      .eq('id', booking.id)
    setStartingService(false)
    if (!error) onRefresh?.()
  }

  const elapsedH = Math.floor(elapsedMs / 3600000)
  const elapsedM = Math.floor((elapsedMs % 3600000) / 60000)
  const timerLabel = elapsedH > 0 ? `${elapsedH}h ${elapsedM}m` : `${elapsedM}m`

  // 30-minute lock before "Concluir Serviço" is available
  const FINISH_LOCK_MS  = 30 * 60 * 1000
  // No lock when: not in_progress, or no started_at recorded, or 30+ min elapsed
  const canFinish       = booking.status !== 'in_progress' ||
                          !booking.started_at ||
                          elapsedMs >= FINISH_LOCK_MS
  const minutesToFinish = Math.max(1, Math.ceil((FINISH_LOCK_MS - elapsedMs) / 60000))

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
                isProvider ? (
                  <a
                    href={
                      booking.client_latitude && booking.client_longitude
                        ? `https://www.google.com/maps/dir/?api=1&destination=${booking.client_latitude},${booking.client_longitude}`
                        : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(booking.address)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 hover:underline mt-1 font-medium"
                  >
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span>{booking.address}</span>
                    <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 opacity-70" />
                  </a>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                    <MapPin className="w-3 h-3" />
                    {booking.address}
                  </div>
                )
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

          {/* GPS indicator + elapsed timer + countdown (Feature 2) */}
          {booking.status === 'in_progress' && (
            <div className="flex flex-col gap-1 mt-2">
              <div className="flex items-center gap-2 text-xs text-primary-600 font-medium flex-wrap">
                <span className="flex items-center gap-1">
                  <Navigation className="w-3 h-3 animate-pulse" />
                  {isProvider ? 'Partilha de localização activa' : 'A seguir localização em tempo real'}
                </span>
                {elapsedMs > 0 && (
                  <span className="text-emerald-600 font-semibold">⏱ Serviço em curso: {timerLabel}</span>
                )}
              </div>
              {isProvider && !canFinish && (
                <span className="text-xs text-amber-600 font-medium">
                  ⏳ Conclusão disponível em: {minutesToFinish}m
                </span>
              )}
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
              {/* Iniciar Serviço — Feature 2: provider, confirmed booking */}
              {isProvider && booking.status === 'confirmed' && (
                booking.client_latitude && booking.client_longitude ? (
                  nearClient ? (
                    <button
                      onClick={handleStartService}
                      disabled={startingService}
                      className="flex items-center gap-1.5 text-xs font-semibold text-white
                                 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                    >
                      {startingService
                        ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        : null}
                      ▶️ Iniciar Serviço
                    </button>
                  ) : (
                    <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                      📍 Aproxima-te do local para iniciar o serviço
                    </span>
                  )
                ) : (
                  <button
                    onClick={handleStartService}
                    disabled={startingService}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white
                               bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                  >
                    {startingService
                      ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      : null}
                    ▶️ Iniciar Serviço
                  </button>
                )
              )}
              {/* Finish service — provider only, confirmed or in_progress (30-min lock for in_progress) */}
              {isProvider && isActive && (
                canFinish ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onFinishService(booking) }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white
                               bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    ✅ Concluir Serviço
                  </button>
                ) : (
                  <span className="text-xs text-amber-600 font-medium">
                    ⏳ Poderás concluir em {minutesToFinish}m
                  </span>
                )
              )}
              {/* Chat — active bookings (confirmed / in_progress) */}
              {isActive && (
                <button
                  onClick={(e) => { e.stopPropagation(); onOpenChat(booking) }}
                  className="relative flex items-center gap-1.5 text-xs font-semibold text-blue-600
                             bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  💬 Chat
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full
                                     bg-red-500 text-white text-[10px] font-bold
                                     flex items-center justify-center px-1 leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
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

          {/* Feature 3 — Professional booking detail panels */}
          {/* PROTECTED — DO NOT REMOVE */}
          {isProvider && (
            hasCare
              ? <BookingPatientPanel bookingId={booking.id} />
              : <BookingServicePanel booking={booking} />
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
  const location = useLocation()
  const { startOnboarding, loading: connectLoading } = useStripeConnect()
  const [expandedId, setExpandedId]           = useState(null)
  const [filter, setFilter]                   = useState('all')
  const [addHoursBooking, setAddHoursBooking] = useState(null)
  const [finishBooking, setFinishBooking]     = useState(null)
  const [finishLoading, setFinishLoading]     = useState(false)
  const [successMsg, setSuccessMsg]           = useState(null)
  const [ratingBooking, setRatingBooking]     = useState(null)
  const [ratingLoading, setRatingLoading]     = useState(false)
  const [profRating, setProfRating]           = useState(null)
  const [ratingBreakdown, setRatingBreakdown] = useState(null)
  const [cancelTarget, setCancelTarget]       = useState(null)
  const [cancelLoading, setCancelLoading]     = useState(false)
  const [weeklyData, setWeeklyData]           = useState(null)
  const [weekOffset, setWeekOffset]           = useState(0)  // 0=current, -1=last, etc.
  const [profCountry, setProfCountry]         = useState('PT')
  const [unreadCounts, setUnreadCounts]       = useState({})
  // Stripe Connect state
  const [stripeConnected,  setStripeConnected]  = useState(false)
  const [stripeBalance,    setStripeBalance]     = useState(null)   // { available, pending, currency, dashboardUrl }
  const [stripeBalLoading, setStripeBalLoading]  = useState(false)
  const [stripeSuccessBanner, setStripeSuccessBanner] = useState(false)
  const [unreadBookingCount, setUnreadBookingCount] = useState(0)

  // Derive isProvider early — must be before any useEffect that references it
  const isProvider = userRole === 'professional'
  // profServiceType: needed to decide whether to show the Pacientes tab
  const [profServiceType, setProfServiceType] = useState(null)
  // dashTab: 'bookings' | 'patients' — only active for care professionals
  const [dashTab, setDashTab] = useState('bookings')
  // clientDashTab: 'bookings' | 'patients' — Feature 1: client tab when they have care bookings
  const [clientDashTab, setClientDashTab] = useState('bookings')

  useEffect(() => { fetchBookings() }, [])

  // Fetch professional's own average rating + country + Stripe Connect status
  useEffect(() => {
    if (!isProvider || !user) return
    supabase.from('profiles')
      .select('average_rating, total_reviews, country, service_type, stripe_account_id, stripe_connect_status')
      .eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.total_reviews > 0) setProfRating(data.average_rating)
        if (data?.country)       setProfCountry(data.country)
        if (data?.service_type)  setProfServiceType(data.service_type)
        setStripeConnected(!!(data?.stripe_account_id))
      })
  }, [isProvider, user])

  // Fetch Stripe Connect balance when professional has a connected account
  useEffect(() => {
    if (!isProvider || !stripeConnected || !user) return
    setStripeBalLoading(true)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setStripeBalLoading(false); return }
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/stripe-connect-balance`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        })
        if (resp.ok) {
          const data = await resp.json()
          setStripeBalance(data)
        }
      } catch { /* balance fetch is non-critical */ }
      finally { setStripeBalLoading(false) }
    })
  }, [isProvider, stripeConnected, user])

  // Detect ?stripe=success return from Stripe Connect onboarding
  useEffect(() => {
    if (!location.search.includes('stripe=success')) return
    setStripeSuccessBanner(true)
    setStripeConnected(true)
    // Clean URL without reload
    window.history.replaceState({}, '', '/dashboard')
    setTimeout(() => setStripeSuccessBanner(false), 6000)
  }, [location.search])

  // Fetch rating breakdown for the current user (both providers and clients receive ratings)
  useEffect(() => {
    if (!user?.id) return
    supabase.from('reviews').select('rating').eq('reviewed_id', user.id)
      .then(({ data }) => {
        const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        if (data?.length) {
          data.forEach((r) => { if (r.rating >= 1 && r.rating <= 5) counts[r.rating] += 1 })
          const total = data.length
          const avg = data.reduce((s, r) => s + r.rating, 0) / total
          setRatingBreakdown({ counts, total, avg })
        } else {
          // No reviews yet — starts at 5 stars
          setRatingBreakdown({ counts, total: 0, avg: 5 })
        }
      })
  }, [user?.id])

  // Fetch weekly earnings for professionals
  useEffect(() => {
    if (!isProvider || !user) return

    // Build Mon of the selected week (weekOffset=0 → current week)
    const toDateStr = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const now = new Date()
    const dow = now.getDay() // 0=Sun
    const diffToMon = dow === 0 ? -6 : 1 - dow
    const monday = new Date(now)
    monday.setDate(now.getDate() + diffToMon + weekOffset * 7)
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return toDateStr(d)
    })

    supabase
      .from('bookings')
      .select('completed_at, updated_at, scheduled_date, total_price')
      .eq('provider_id', user.id)
      .eq('status', 'completed')
      .then(({ data, error }) => {
        if (error) console.error('[Faturamento] query error:', error)
        const days = weekDates.map((dateStr) => ({ dateStr, count: 0, total: 0 }))
        for (const b of (data || [])) {
          const dateStr =
            (b.completed_at || b.updated_at)?.slice(0, 10) || b.scheduled_date || null
          if (!dateStr) continue
          const idx = weekDates.indexOf(dateStr)
          if (idx === -1) continue
          days[idx].count++
          days[idx].total += parseFloat(b.total_price || 0)
        }
        setWeeklyData(days.map((d, i) => {
          const date = new Date(monday)
          date.setDate(monday.getDate() + i)
          return { date, count: d.count, total: d.total }
        }))
      })
  }, [isProvider, user, weekOffset])

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
          // Feature 2: notify client when professional starts the service
          if (payload.new?.status === 'in_progress') {
            addNotification({
              id: Date.now(),
              message: 'O profissional chegou e iniciou o serviço',
              type: 'success',
            })
            fetchBookings()
          }
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

  // Fetch initial unread message counts for all bookings
  useEffect(() => {
    if (!user?.id || !bookings.length) return
    const ids = bookings.map((b) => b.id)
    supabase
      .from('messages')
      .select('booking_id')
      .in('booking_id', ids)
      .neq('sender_id', user.id)
      .is('read_at', null)
      .then(({ data }) => {
        const counts = {}
        for (const m of (data || [])) {
          counts[m.booking_id] = (counts[m.booking_id] || 0) + 1
        }
        setUnreadCounts(counts)
      })
  }, [user?.id, bookings.length])

  // Realtime: increment unread badge when a new message arrives from the other party
  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`dashboard-unread-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new
          if (msg.sender_id !== user.id) {
            setUnreadCounts((prev) => ({
              ...prev,
              [msg.booking_id]: (prev[msg.booking_id] || 0) + 1,
            }))
          }
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user?.id])

  const handleOpenChat = useCallback((booking) => {
    // Clear badge immediately on open
    setUnreadCounts((prev) => ({ ...prev, [booking.id]: 0 }))
    navigate(`/chat/${booking.id}`)
  }, [navigate])

  // ── Unread new-booking badge (professionals only) ──────────────────────────
  // Fetch count of bookings the professional hasn't seen yet
  useEffect(() => {
    if (!user?.id || !isProvider) return
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', user.id)
      .is('provider_read_at', null)
      .then(({ count }) => setUnreadBookingCount(count || 0))
  }, [user?.id, isProvider])

  // Realtime: increment badge when a new booking is inserted for this provider
  useEffect(() => {
    if (!user?.id || !isProvider) return
    const channel = supabase
      .channel(`provider-new-bookings-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookings', filter: `provider_id=eq.${user.id}` },
        () => setUnreadBookingCount((c) => c + 1),
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user?.id, isProvider])

  // Mark bookings as read when professional is viewing the bookings tab
  useEffect(() => {
    if (!user?.id || !isProvider || loading || dashTab !== 'bookings') return
    supabase
      .from('bookings')
      .update({ provider_read_at: new Date().toISOString() })
      .eq('provider_id', user.id)
      .is('provider_read_at', null)
      .then(() => setUnreadBookingCount(0))
  }, [dashTab, loading, user?.id, isProvider])

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

  // Feature 1: client has at least one confirmed/active booking with a care professional
  const clientHasCareBooking = !isProvider && (bookings || []).some((b) =>
    PATIENT_CARE_ROLES.has(b.provider?.service_type) &&
    ['confirmed', 'in_progress'].includes(b.status)
  )

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
              <>
                <Link
                  to="/edit-profile"
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl
                             text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Editar perfil
                </Link>
                <Link to="/search" className="btn-primary text-sm">
                  <Plus className="w-4 h-4" />
                  Novo agendamento
                </Link>
              </>
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

        {/* ── Rating Breakdown — visible on BOTH professional and client dashboards ── */}
        {/* DO NOT REMOVE — required feature for both dashboards */}
        {ratingBreakdown && (
          <div className="card mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <h2 className="text-lg font-bold text-gray-900">
                {isProvider ? 'A minha reputação' : 'A minha avaliação'}
              </h2>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl font-extrabold text-gray-900">
                ⭐ {ratingBreakdown.avg.toFixed(1)}
              </span>
              <span className="text-sm text-gray-400">
                ({ratingBreakdown.total} {ratingBreakdown.total === 1 ? 'avaliação' : 'avaliações'})
              </span>
            </div>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((n) => {
                const count = ratingBreakdown.counts[n] || 0
                const pct = ratingBreakdown.total > 0 ? (count / ratingBreakdown.total) * 100 : 0
                return (
                  <div key={n} className="flex items-center gap-2 text-sm">
                    <span className="w-3 text-right text-gray-600 font-medium flex-shrink-0">{n}</span>
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-5 text-right text-xs text-gray-400 flex-shrink-0">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Service Manager (providers only) ── */}
        {isProvider && <ServiceManager />}

        {/* ── Weekly Earnings (providers only) ── */}
        {isProvider && weeklyData && (() => {
          const curr = profCountry === 'BR' ? 'R$' : '€'
          const DAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
          const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
          const weekTotal = weeklyData.reduce((s, d) => s + d.total, 0)
          const today = new Date()
          const todayIdx = weekOffset === 0 ? (today.getDay() === 0 ? 6 : today.getDay() - 1) : -1
          const mon = weeklyData[0]?.date
          const sun = weeklyData[6]?.date
          const fmtDay = (d) => d ? `${d.getDate()} ${MONTH_ABBR[d.getMonth()]}` : ''
          const weekLabel = mon && sun
            ? sun.getFullYear() !== mon.getFullYear()
              ? `${fmtDay(mon)} ${mon.getFullYear()} — ${fmtDay(sun)} ${sun.getFullYear()}`
              : `${fmtDay(mon)} — ${fmtDay(sun)} ${sun.getFullYear()}`
            : 'Esta semana'

          return (
            <div className="card mb-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-gray-900">Faturamento</h2>
                <div className="flex items-center gap-1 ml-auto">
                  <button
                    onClick={() => setWeekOffset((w) => w - 1)}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                    title="Semana anterior"
                  >
                    <ChevronDown className="w-4 h-4 rotate-90" />
                  </button>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {weekOffset === 0 ? 'Esta semana' : weekLabel}
                  </span>
                  <button
                    onClick={() => setWeekOffset((w) => w + 1)}
                    disabled={weekOffset >= 0}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Próxima semana"
                  >
                    <ChevronDown className="w-4 h-4 -rotate-90" />
                  </button>
                </div>
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

        {/* ── Stripe Connect banner: returned from onboarding ── */}
        {stripeSuccessBanner && (
          <div className="mb-5 flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-emerald-800 text-sm">Conta bancária conectada com sucesso!</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                A partir de agora recebes 85% de cada pagamento automaticamente via Stripe.
              </p>
            </div>
          </div>
        )}

        {/* ── Stripe Connect earnings panel (providers only) ─────────────────── */}
        {isProvider && (
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">💳 Conta Stripe</h2>
              {!stripeConnected && (
                <button
                  onClick={startOnboarding}
                  disabled={connectLoading}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary-600
                             hover:bg-primary-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                >
                  {connectLoading
                    ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : null}
                  💳 Conectar conta bancária
                </button>
              )}
            </div>

            {!stripeConnected ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Conecta a tua conta bancária para receber <strong>85%</strong> de cada pagamento
                automaticamente. A plataforma retém 15% como comissão.
              </p>
            ) : stripeBalLoading ? (
              <div className="space-y-2">
                <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />
                <div className="h-6 bg-gray-100 rounded-lg animate-pulse w-2/3" />
              </div>
            ) : stripeBalance ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 rounded-xl p-4 text-center">
                    <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">Disponível</p>
                    <p className="text-2xl font-extrabold text-emerald-700">
                      {stripeBalance.currency === 'brl' ? 'R$' : '€'} {stripeBalance.available.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4 text-center">
                    <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">Pendente</p>
                    <p className="text-2xl font-extrabold text-amber-700">
                      {stripeBalance.currency === 'brl' ? 'R$' : '€'} {stripeBalance.pending.toFixed(2)}
                    </p>
                  </div>
                </div>
                {stripeBalance.dashboardUrl && (
                  <a
                    href={stripeBalance.dashboardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl
                               border border-gray-200 text-sm font-semibold text-gray-700
                               hover:bg-gray-50 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    💸 Transferir para conta bancária
                  </a>
                )}
                <p className="text-xs text-gray-400 text-center">
                  Pagamentos disponíveis em 2–5 dias úteis. Gerir transferências no painel Stripe.
                </p>
              </div>
            ) : (
              <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                ✅ Conta bancária conectada. Saldo a carregar...
              </p>
            )}
          </div>
        )}

        {/* PROTECTED — DO NOT REMOVE */}
        {/* Feature 1 — Paciente tab selector for clients with confirmed care bookings */}
        {clientHasCareBooking && (
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
            {[
              { key: 'bookings', label: '📅 Agendamentos' },
              { key: 'patients', label: '🏥 Paciente'     },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setClientDashTab(key)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all
                            ${clientDashTab === key
                              ? 'bg-white shadow-sm text-primary-600'
                              : 'text-gray-500 hover:text-gray-700'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* PROTECTED — DO NOT REMOVE */}
        {/* Feature 1 — PatientManager for client (Paciente tab) */}
        {clientHasCareBooking && clientDashTab === 'patients' && (
          <PatientManager isProvider={false} />
        )}

        {/* PROTECTED FEATURE — DO NOT REMOVE */}
        {/* ── Pacientes tab selector (care professionals only) ── */}
        {isProvider && PATIENT_CARE_ROLES.has(profServiceType) && (
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
            {[
              { key: 'bookings', label: '📅 Agendamentos' },
              { key: 'patients', label: '🏥 Pacientes'    },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setDashTab(key)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all
                            ${dashTab === key
                              ? 'bg-white shadow-sm text-primary-600'
                              : 'text-gray-500 hover:text-gray-700'}`}
              >
                <span className="relative inline-flex items-center gap-1.5">
                  {label}
                  {key === 'bookings' && unreadBookingCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px]
                                     rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
                      {unreadBookingCount > 9 ? '9+' : unreadBookingCount}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── Patient Manager (care professionals — Pacientes tab) ── */}
        {isProvider && PATIENT_CARE_ROLES.has(profServiceType) && dashTab === 'patients' && (
          <PatientManager isProvider={true} />
        )}

        {/* ── Bookings panel ── */}
        {(dashTab === 'bookings' || !PATIENT_CARE_ROLES.has(profServiceType)) &&
         (clientDashTab === 'bookings' || !clientHasCareBooking) && <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              Agendamentos
              {isProvider && unreadBookingCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5
                                 rounded-full bg-red-500 text-white text-xs font-bold px-1.5 leading-none">
                  {unreadBookingCount > 9 ? '9+' : unreadBookingCount}
                </span>
              )}
            </h2>

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
                  unreadCount={unreadCounts[booking.id] || 0}
                  onOpenChat={handleOpenChat}
                />
              ))}
            </div>
          )}
        </div>}

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
