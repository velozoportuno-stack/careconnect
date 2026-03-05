import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Star, MapPin, Clock, Shield, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/appStore'
import { formatCurrency, formatRating } from '../utils/formatters'

export default function Profile() {
  const { id } = useParams()
  const { user } = useAppStore()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [id])

  const fetchProfile = async () => {
    const [{ data: prof }, { data: svc }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('services').select('*').eq('provider_id', id).eq('is_available', true),
    ])
    setProfile(prof)
    setServices(svc || [])
    setLoading(false)
  }

  const handleBook = (serviceId) => {
    if (!user) {
      navigate('/login')
      return
    }
    navigate(`/booking?provider=${id}&service=${serviceId}`)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Carregando...</div>
  if (!profile) return <div className="min-h-screen flex items-center justify-center text-gray-400">Perfil não encontrado.</div>

  const roleLabel = { caregiver: 'Cuidador', nurse: 'Enfermeiro(a)', cleaner: 'Assistente de Limpeza', fisioterapia: 'Fisioterapeuta' }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold text-primary-600">CareConnect</Link>
          <Link to="/search" className="text-gray-600 hover:text-gray-900">← Voltar</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile header */}
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center text-4xl flex-shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="w-24 h-24 rounded-full object-cover" />
              ) : '👤'}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{profile.full_name}</h1>
              <p className="text-primary-600 font-medium">{roleLabel[profile.role] || profile.role}</p>

              <div className="flex flex-wrap gap-4 mt-3">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-medium">{formatRating(profile.rating)}</span>
                  <span className="text-gray-400 text-sm">({profile.total_reviews} avaliações)</span>
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{profile.city || 'Portugal'}</span>
                </div>
                {profile.is_verified && (
                  <div className="flex items-center gap-1 text-care-green">
                    <Shield className="w-4 h-4" />
                    <span className="text-sm font-medium">Verificado</span>
                  </div>
                )}
              </div>

              {profile.hourly_rate && (
                <p className="mt-3 text-xl font-bold text-primary-600">
                  {formatCurrency(profile.hourly_rate)}<span className="text-sm font-normal text-gray-500">/hora</span>
                </p>
              )}
            </div>
          </div>

          {profile.bio && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h2 className="font-semibold mb-2">Sobre mim</h2>
              <p className="text-gray-600">{profile.bio}</p>
            </div>
          )}
        </div>

        {/* Services */}
        {services.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Serviços Disponíveis</h2>
            <div className="space-y-4">
              {services.map((svc) => (
                <div key={svc.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                  <div>
                    <h3 className="font-medium">{svc.title}</h3>
                    {svc.description && <p className="text-sm text-gray-500 mt-1">{svc.description}</p>}
                    <div className="flex items-center gap-1 text-sm text-gray-400 mt-1">
                      <Clock className="w-3 h-3" />
                      {svc.duration_hours}h
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatCurrency(svc.price_per_hour)}/h</span>
                    <button onClick={() => handleBook(svc.id)} className="btn-primary text-sm flex items-center gap-1">
                      <Calendar className="w-4 h-4" /> Agendar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {services.length === 0 && (
          <div className="card text-center py-8 text-gray-400">
            <p>Nenhum serviço disponível no momento.</p>
            <button onClick={() => handleBook(null)} className="btn-primary mt-4">
              Entrar em contacto
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
