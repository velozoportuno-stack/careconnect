import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, Star, MapPin, SlidersHorizontal, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatRating } from '../utils/formatters'
import { COUNTRIES, CITIES } from '../utils/locations'
import Navbar from '../components/Navbar'

const CATEGORIES = [
  { value: 'Todos',     label: 'Todos',                 icon: '🔍' },
  { value: 'caregiver', label: 'Cuidador de Idosos',    icon: '🧓' },
  { value: 'nurse',     label: 'Enfermeiro(a)',          icon: '🩺' },
  { value: 'cleaner',   label: 'Assistente de Limpeza', icon: '🧹' },
]

const CATEGORY_LABEL = {
  caregiver: 'Cuidador(a) de Idosos',
  nurse:     'Enfermeiro(a)',
  cleaner:   'Assistente de Limpeza',
}

const CATEGORY_BADGE = {
  caregiver: 'badge-amber',
  nurse:     'badge-blue',
  cleaner:   'badge-teal',
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
    title: svc.title, category: svc.category || p.role,
    bio: svc.bio || svc.description, price: svc.price_per_hour,
    providerName: p.full_name, avatar: p.avatar_url,
    rating: p.rating || 0, totalReviews: p.total_reviews || 0,
    city: p.city,
  }
}

function normalizeProfile(p) {
  return {
    serviceId: null, providerId: p.id,
    title: CATEGORY_LABEL[p.role] || 'Serviço', category: p.role,
    bio: p.bio, price: p.hourly_rate,
    providerName: p.full_name, avatar: p.avatar_url,
    rating: p.rating || 0, totalReviews: p.total_reviews || 0,
    city: p.city,
  }
}

export default function Search() {
  const [searchParams] = useSearchParams()
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [nameQuery, setName]    = useState('')
  const [country, setCountry]   = useState('PT')
  const [city, setCity]         = useState('')
  const [category, setCategory] = useState(() => searchParams.get('category') || 'Todos')

  useEffect(() => { fetchItems() }, [category])

  async function fetchItems() {
    setLoading(true)
    let q = supabase
      .from('provider_services')
      .select('id, category, title, description, bio, price_per_hour, provider_id, provider:provider_id(id, full_name, avatar_url, rating, total_reviews, city, is_active)')
      .eq('is_available', true)
    if (category !== 'Todos') q = q.eq('category', category)

    const { data, error } = await q.order('created_at', { ascending: false })

    if (!error && data?.length > 0) {
      setItems(data.filter((s) => s.provider?.is_active !== false).map(normalizeService))
    } else {
      // Fallback to profiles (before migration runs)
      let pq = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio, city, hourly_rate, rating, total_reviews, role')
        .neq('role', 'client').neq('role', 'admin').eq('is_active', true)
      if (category !== 'Todos') pq = pq.eq('role', category)
      const { data: pd } = await pq.order('rating', { ascending: false })
      setItems((pd || []).map(normalizeProfile))
    }
    setLoading(false)
  }

  const filtered = items.filter((item) => {
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
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <SlidersHorizontal className="w-4 h-4 text-gray-400" />
          {CATEGORIES.map((cat) => (
            <button key={cat.value} onClick={() => setCategory(cat.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all
                ${category === cat.value ? 'bg-primary-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-700'}`}>
              <span>{cat.icon}</span>{cat.label}
            </button>
          ))}
        </div>

        {!loading && (
          <p className="text-sm text-gray-500 mb-5">
            {filtered.length} serviço{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
            {city ? ` em ${city}` : ''}
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
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">Nenhum serviço encontrado</h3>
            <p className="text-gray-400 text-sm">Tenta outros filtros ou remove o filtro de cidade.</p>
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
                          {CATEGORY_LABEL[item.category] || item.category}
                        </span>
                      </div>
                      {item.price && (
                        <span className="text-primary-600 font-bold text-base whitespace-nowrap flex-shrink-0">
                          {formatCurrency(item.price)}<span className="text-xs text-gray-400 font-normal">/h</span>
                        </span>
                      )}
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
