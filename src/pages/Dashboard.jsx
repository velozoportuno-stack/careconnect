import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, Star, Bell, LogOut, Search, User, ChevronDown, ChevronUp } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { useAuth } from '../hooks/useAuth'
import { useBookings } from '../hooks/useBookings'
import { formatDate, formatCurrency } from '../utils/formatters'
import ClientTrackingView from '../components/maps/ClientTrackingView'
import ProviderLocationShare from '../components/maps/ProviderLocationShare'

const STATUS_LABELS = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'Em andamento', color: 'bg-green-100 text-green-700' },
  completed: { label: 'Concluído', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
}

const TRACKING_STATUSES = new Set(['confirmed', 'in_progress', 'completed'])

export default function Dashboard() {
  const { user, userRole, notifications } = useAppStore()
  const { signOut } = useAuth()
  const { bookings, fetchBookings, loading } = useBookings()
  const navigate = useNavigate()
  const [expandedBookingId, setExpandedBookingId] = useState(null)

  useEffect(() => {
    fetchBookings()
  }, [])

  const toggleTracking = (bookingId) => {
    setExpandedBookingId((prev) => (prev === bookingId ? null : bookingId))
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold text-primary-600">CareConnect</Link>
          <div className="flex items-center gap-4">
            <Link to="/search" className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
              <Search className="w-4 h-4" /> Procurar
            </Link>
            <button className="relative">
              <Bell className="w-5 h-5 text-gray-500" />
              {notifications.filter(n => !n.is_read).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {notifications.filter(n => !n.is_read).length}
                </span>
              )}
            </button>
            <button onClick={handleSignOut} className="flex items-center gap-1 text-gray-500 hover:text-red-500">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Olá, {user?.user_metadata?.full_name || user?.email?.split('@')[0]} 👋
          </h1>
          <p className="text-gray-500 mt-1">
            {userRole === 'client' ? 'Gerencie os seus agendamentos' : 'Gerencie os seus serviços'}
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-primary-500" />
              <div>
                <p className="text-2xl font-bold">{bookings.length}</p>
                <p className="text-gray-500 text-sm">Agendamentos</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <Star className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{bookings.filter(b => b.status === 'completed').length}</p>
                <p className="text-gray-500 text-sm">Concluídos</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8 text-care-green" />
              <div>
                <p className="text-2xl font-bold capitalize">{userRole || '—'}</p>
                <p className="text-gray-500 text-sm">Tipo de conta</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Agendamentos Recentes</h2>
            <Link to="/search" className="btn-primary text-sm">
              + Novo Agendamento
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Carregando...</div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum agendamento ainda.</p>
              <Link to="/search" className="text-primary-600 hover:underline mt-2 inline-block">
                Encontrar um profissional
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {bookings.map((booking) => {
                const s = STATUS_LABELS[booking.status] || STATUS_LABELS.pending
                const hasTracking = TRACKING_STATUSES.has(booking.status)
                const isExpanded = expandedBookingId === booking.id

                return (
                  <div key={booking.id} className="border border-gray-100 rounded-lg overflow-hidden">
                    {/* Linha da reserva */}
                    <div
                      className={`flex items-center justify-between p-4 ${hasTracking ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
                      onClick={() => hasTracking && toggleTracking(booking.id)}
                    >
                      <div>
                        <p className="font-medium">{booking.service?.title || 'Serviço'}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(booking.scheduled_date)} às {booking.scheduled_time?.slice(0, 5)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{formatCurrency(booking.total_price)}</span>
                        <span className={`badge ${s.color}`}>{s.label}</span>
                        {hasTracking && (
                          isExpanded
                            ? <ChevronUp className="w-4 h-4 text-gray-400" />
                            : <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Painel de rastreio — expande ao clicar */}
                    {hasTracking && isExpanded && (
                      <div className="border-t border-gray-100 p-4 bg-gray-50">
                        {userRole === 'client' ? (
                          <ClientTrackingView booking={booking} />
                        ) : (
                          <ProviderLocationShare booking={booking} providerId={user?.id} />
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
