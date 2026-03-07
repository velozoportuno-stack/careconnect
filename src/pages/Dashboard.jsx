import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import {
  Heart, CalendarDays, CheckCircle2, Clock, MapPin, LogOut,
  Search, ChevronDown, ChevronUp, Plus, Briefcase, Navigation,
  Settings, PlusCircle, Star,
} from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { useAuth } from '../hooks/useAuth'
import { useBookings } from '../hooks/useBookings'
import { formatDate, formatCurrency } from '../utils/formatters'
import ClientTrackingView from '../components/maps/ClientTrackingView'
import ProviderLocationShare from '../components/maps/ProviderLocationShare'
import MedicationAlarms from '../components/dashboard/MedicationAlarms'
import AddHoursModal from '../components/dashboard/AddHoursModal'
import ServiceManager from '../components/dashboard/ServiceManager'

const STATUS_LABELS = {
  pending:     { label: 'Pendente',       css: 'status-pending' },
  confirmed:   { label: 'Confirmado',     css: 'status-confirmed' },
  in_progress: { label: 'Em andamento',   css: 'status-in_progress' },
  completed:   { label: 'Concluído',      css: 'status-completed' },
  cancelled:   { label: 'Cancelado',      css: 'status-cancelled' },
}

const ROLE_LABEL = {
  client:    'Cliente',
  caregiver: 'Cuidador(a) de Idosos',
  nurse:     'Enfermeiro(a)',
  cleaner:   'Assistente de Limpeza',
  admin:     'Administrador',
}

const TRACKING_STATUSES = new Set(['confirmed', 'in_progress', 'completed'])
const CARE_ROLES = new Set(['caregiver', 'nurse'])
const ACTIVE_STATUSES = new Set(['confirmed', 'in_progress'])

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

function BookingRow({ booking, userRole, userId, isExpanded, onToggle, onAddHours, onRefresh }) {
  const s = STATUS_LABELS[booking.status] || STATUS_LABELS.pending
  const hasTracking = TRACKING_STATUSES.has(booking.status)
  const isProvider  = userRole !== 'client'
  const isActive    = ACTIVE_STATUSES.has(booking.status)
  const hasCare     = CARE_ROLES.has(isProvider ? userRole : booking.provider?.role)

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
              {booking.provider?.rating > 0 && !isProvider && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-semibold text-gray-600">
                    {Number(booking.provider.rating).toFixed(1)}
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

          {/* Action buttons for client on active bookings */}
          {!isProvider && isActive && (
            <div className="mt-3">
              <button
                onClick={(e) => { e.stopPropagation(); onAddHours(booking) }}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary-600
                           bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Acrescentar horas
              </button>
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
  const { user, userRole, secondaryRole, activeRole } = useAppStore()
  const { signOut } = useAuth()
  const { bookings, fetchBookings, loading } = useBookings()
  const navigate = useNavigate()
  const [expandedId, setExpandedId]         = useState(null)
  const [filter, setFilter]                 = useState('all')
  const [addHoursBooking, setAddHoursBooking] = useState(null)

  useEffect(() => { fetchBookings() }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  // Use the active role for all role-based UI decisions
  const effectiveRole = activeRole || userRole
  const isProvider = effectiveRole && effectiveRole !== 'client' && effectiveRole !== 'admin'
  // Show "become professional" banner only for pure clients (no secondary role yet)
  const showBecomePro = effectiveRole === 'client' && !secondaryRole

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'all')    return true
    if (filter === 'active') return ['pending', 'confirmed', 'in_progress'].includes(b.status)
    if (filter === 'done')   return b.status === 'completed'
    return true
  })

  const completedCount = bookings.filter((b) => b.status === 'completed').length
  const activeCount    = bookings.filter((b) => ['pending', 'confirmed', 'in_progress'].includes(b.status)).length

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Utilizador'

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
              {effectiveRole && (
                <span className="badge-teal text-xs">
                  {ROLE_LABEL[effectiveRole] || effectiveRole}
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
        </div>

        {/* ── Become a professional banner (clients without a pro profile) ── */}
        {showBecomePro && (
          <div className="card mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4
                          border-2 border-amber-100 bg-amber-50">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">Oferece também os teus serviços</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Com a mesma conta podes atuar como cuidador, enfermeiro ou assistente de limpeza.
              </p>
            </div>
            <Link
              to="/register?add_role=professional"
              className="btn-primary text-sm whitespace-nowrap flex-shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              Adicionar perfil profissional
            </Link>
          </div>
        )}

        {/* ── Service Manager (providers only) ── */}
        {isProvider && <ServiceManager />}

        {/* ── Bookings panel ── */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900">Agendamentos</h2>

            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {[
                { key: 'all',    label: 'Todos' },
                { key: 'active', label: 'Activos' },
                { key: 'done',   label: 'Concluídos' },
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
                  userRole={effectiveRole}
                  userId={user?.id}
                  isExpanded={expandedId === booking.id}
                  onToggle={(id) => setExpandedId((prev) => (prev === id ? null : id))}
                  onAddHours={(b) => setAddHoursBooking(b)}
                  onRefresh={fetchBookings}
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
    </div>
  )
}
