import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { Search as SearchIcon, Star, MapPin, ChevronRight, Hash } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatRating } from '../utils/formatters'
import { COUNTRIES, CITIES } from '../utils/locations'
import { CLEANING_TYPE_LABELS, SERVICE_TYPES, SERVICE_TYPE_LABELS } from '../utils/constants'
import Navbar from '../components/Navbar'

const CATEGORY_BADGE = {
  nurse:            'badge-blue',
  auxiliary_nurse:  'badge-blue',
  caregiver:        'badge-amber',
  physiotherapist:  'badge-blue',
  psychologist:     'badge-blue',
  nutritionist:     'badge-blue',
  personal_trainer: 'badge-amber',
  cleaner:          'badge-teal',
}

function StarRating({ rating, total }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`w-3.5 h-3.5 ${n <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`} />
      ))}
      <span className="text-sm text-gray-500 ml-1">
        {formatRating(rating)} <span className="text-gray-400">({total})</span>
      </span>
    </div>
  )
}

function Avatar({ src, name }) {
  const initials = name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?'
  if (src) return <img src={src} alt={name} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
  return (
    <div className="w-16 h-16 rounded-2xl bg-primary-100 text-primary-700 font-bold text-lg flex items-center justify-center flex-shrink-0">
      {initials}
    </div>
  )
}

function normalizeService(svc) {
  const p = svc.provider || {}
  return {
    serviceId: svc.id, providerId: svc.provider_id || p.id,
    title: svc.title, category: svc.category || p.service_type,
    bio: svc.bio || svc.description, price: svc.price_per_hour,
    dailyRate: p.daily_rate || null,
    cleaningTypes: p.cleaning_types || null,
    providerName: p.full_name, avatar: p.avatar_url,
    rating: p.average_rating || p.rating || 0, totalReviews: p.total_reviews || 0,
    city: p.city,
    professionalIdNumber: p.professional_id_number || null,
  }
}

function normalizeProfile(p) {
  return {
    serviceId: null, providerId: p.id,
    title: SERVICE_TYPE_LABELS[p.service_type] || 'Profissional', category: p.service_type,
    bio: p.bio, price: p.hourly_rate,
    dailyRate: p.daily_rate || null,
    cleaningTypes: p.cleaning_types || null,
    providerName: p.full_name, avatar: p.avatar_url,
    rating: p.average_rating || p.rating || 0, totalReviews: p.total_reviews || 0,
    city: p.city,
    professionalIdNumber: p.professional_id_number || null,
  }
}

export default function Search() {
  const { userRole } = useAppStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Professionals cannot access the search — redirect to dashboard
  useEffect(() => {
    if (userRole === 'professional') navigate('/dashboard', { replace: true })
  }, [userRole, navigate])
  const [items, setItems]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [nameQuery, setName]      = useState('')
  const [idQuery, setIdQuery]     = useState('')
  const [country, setCountry]     = useState('PT')
  const [city, setCity]           = useState('')
  const [category, setCategory]   = useState(() => searchParams.get('category') || 'Todos')

  useEffect(() => { fetchItems() }, [category])

  async function fetchItems() {
    setLoading(true)

    // Query profiles for all professionals.
    // NOTE: is_active does NOT exist on the profiles table — only on provider_services.
    // No is_active filter here; all role='professional' rows are included.
    let q = supabase
      .from('profiles')
      .select('id, full_name, avatar_url, bio, city, hourly_rate, daily_rate, cleaning_types, rating, average_rating, total_reviews, service_type, professional_id_number')
      .eq('role', 'professional')

    if (category !== 'Todos') q = q.eq('service_type', category)

    const { data, error } = await q.order('average_rating', { ascending: false, nullsFirst: false })

    if (error) console.error('[Search] profiles query error:', error)
    setItems((data || []).map(normalizeProfile))
    setLoading(false)
  }

  // If user typed a 6-digit ID, search by that
  const idSearchActive = /^\d{6}$/.test(idQuery.trim())

  const filtered = items.filter((item) => {
    if (idSearchActive) {
      return String(item.professionalIdNumber) === idQuery.trim()
    }
    const matchName = !nameQuery || item.providerName?.toLowerCase().includes(nameQuery.toLowerCase())
    const matchCity = !city || item.city?.toLowerCase() === city.toLowerCase()
    return matchName && matchCity
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="bg-gradient-to-r from-primary-600 to-primary-700 py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-6">Encontra o profissional ideal</h1>

          {/* ID search */}
          <div className="mb-3">
            <div className="relative max-w-xs">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                maxLength={6}
                inputMode="numeric"
                placeholder="Buscar por ID do profissional (6 dígitos)"
                className="input-field pl-10 py-3 rounded-xl shadow-sm text-sm w-full"
                value={idQuery}
                onChange={(e) => setIdQuery(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            {idQuery.length > 0 && !idSearchActive && (
              <p className="text-white/70 text-xs mt-1">Digite os 6 dígitos completos do ID</p>
            )}
          </div>

          {/* Name / country / city filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Nome do profissional..." className="input-field pl-11 py-3.5 rounded-xl shadow-sm"
                value={nameQuery} onChange={(e) => setName(e.target.value)} />
            </div>
            <select value={country} onChange={(e) => { setCountry(e.target.value); setCity('') }}
              className="input-field py-3.5 rounded-xl shadow-sm sm:w-44">
              {COUNTRIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select value={city} onChange={(e) => setCity(e.target.value)}
              className="input-field py-3.5 rounded-xl shadow-sm sm:w-48">
              <option value="">Todas as cidades</option>
              {(CITIES[country] || CITIES.PT).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Category filter — dropdown with all service types */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-field py-2 px-4 rounded-full text-sm font-medium border border-gray-200 shadow-sm max-w-xs"
          >
            <option value="Todos">🔍 Todos os profissionais</option>
            <optgroup label="Saúde e Cuidado">
              {SERVICE_TYPES.filter((t) => t.group === 'health').map((t) => (
                <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
              ))}
            </optgroup>
            <optgroup label="Serviços Gerais">
              {SERVICE_TYPES.filter((t) => t.group === 'general' && t.value !== 'other').map((t) => (
                <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
              ))}
            </optgroup>
          </select>
          {category !== 'Todos' && (
            <button
              onClick={() => setCategory('Todos')}
              className="text-xs text-primary-600 hover:underline font-medium"
            >
              × Limpar filtro
            </button>
          )}
        </div>

        {!loading && (
          <p className="text-sm text-gray-500 mb-5">
            {idSearchActive
              ? `Pesquisa por ID: ${idQuery}`
              : `${filtered.length} profissional${filtered.length !== 1 ? 'is' : ''} encontrado${filtered.length !== 1 ? 's' : ''}${city ? ` em ${city}` : ''}`
            }
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">{idSearchActive ? '🔍' : '🔍'}</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              {idSearchActive ? `Nenhum profissional com ID ${idQuery}` : 'Nenhum profissional encontrado'}
            </h3>
            <p className="text-gray-400 text-sm">
              {idSearchActive ? 'Verifica se o ID está correcto.' : 'Tenta outros filtros ou remove o filtro de cidade.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item, i) => (
              <div key={item.serviceId || `${item.providerId}-${i}`} className="card-hover flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <Avatar src={item.avatar} name={item.providerName} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-gray-900 leading-tight text-sm">{item.providerName}</p>
                        <span className={`${CATEGORY_BADGE[item.category] || 'badge-gray'} text-xs mt-0.5`}>
                          {SERVICE_TYPE_LABELS[item.category] || item.category || 'Profissional'}
                        </span>
                        {item.professionalIdNumber && (
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-0.5">
                            <Hash className="w-3 h-3" />{item.professionalIdNumber}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        {item.price && (
                          <span className="text-primary-600 font-bold text-base whitespace-nowrap">
                            {formatCurrency(item.price)}<span className="text-xs text-gray-400 font-normal">/h</span>
                          </span>
                        )}
                        {item.dailyRate && (
                          <span className="text-primary-500 font-semibold text-sm whitespace-nowrap">
                            {formatCurrency(item.dailyRate)}<span className="text-xs text-gray-400 font-normal">/dia</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-1.5">
                      <StarRating rating={item.rating} total={item.totalReviews} />
                    </div>
                  </div>
                </div>

                <p className="font-semibold text-gray-800 text-sm mb-1">{item.title}</p>

                {item.bio && (
                  <p className="text-sm text-gray-500 line-clamp-2 flex-1">{item.bio}</p>
                )}

                {item.cleaningTypes?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.cleaningTypes.slice(0, 3).map((type) => (
                      <span key={type} className="badge-teal text-xs">
                        {CLEANING_TYPE_LABELS[type] || type}
                      </span>
                    ))}
                    {item.cleaningTypes.length > 3 && (
                      <span className="text-xs text-gray-400">+{item.cleaningTypes.length - 3}</span>
                    )}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <MapPin className="w-3.5 h-3.5" />{item.city || 'Portugal'}
                  </div>
                  <Link
                    to={`/profile/${item.providerId}${item.serviceId ? `?service=${item.serviceId}` : ''}`}
                    className="flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    Ver perfil e agendar <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
