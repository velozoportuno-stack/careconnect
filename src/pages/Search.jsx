import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Heart, Search as SearchIcon, Star, MapPin, SlidersHorizontal, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatRating } from '../utils/formatters'

const CATEGORIES = [
  { value: 'Todos',    label: 'Todos',                icon: '🔍' },
  { value: 'caregiver', label: 'Cuidador de Idosos',  icon: '🧓' },
  { value: 'nurse',     label: 'Enfermeiro(a)',        icon: '🩺' },
  { value: 'cleaner',   label: 'Assistente de Limpeza', icon: '🧹' },
]

const ROLE_LABEL = {
  caregiver: 'Cuidador(a) de Idosos',
  nurse:     'Enfermeiro(a)',
  cleaner:   'Assistente de Limpeza',
}

const ROLE_COLOR = {
  caregiver: 'badge-amber',
  nurse:     'badge-blue',
  cleaner:   'badge-teal',
}

function StarRating({ rating, total }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-3.5 h-3.5 ${n <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`}
        />
      ))}
      <span className="text-sm text-gray-500 ml-1">
        {formatRating(rating)} <span className="text-gray-400">({total})</span>
      </span>
    </div>
  )
}

function Avatar({ src, name, size = 'md' }) {
  const dim = size === 'md' ? 'w-16 h-16 text-xl' : 'w-12 h-12 text-base'
  const initials = name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?'
  if (src) {
    return <img src={src} alt={name} className={`${dim} rounded-full object-cover flex-shrink-0`} />
  }
  return (
    <div className={`${dim} rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center flex-shrink-0`}>
      {initials}
    </div>
  )
}

export default function Search() {
  const [searchParams] = useSearchParams()
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [nameQuery, setNameQuery] = useState('')
  const [cityQuery, setCityQuery] = useState('')
  const [category, setCategory] = useState(() => searchParams.get('category') || 'Todos')

  useEffect(() => { fetchProviders() }, [category])

  const fetchProviders = async () => {
    setLoading(true)
    let q = supabase
      .from('profiles')
      .select('id, full_name, avatar_url, bio, city, hourly_rate, rating, total_reviews, role')
      .neq('role', 'client')
      .neq('role', 'admin')
      .eq('is_active', true)

    if (category !== 'Todos') q = q.eq('role', category)

    const { data } = await q.order('rating', { ascending: false })
    setProviders(data || [])
    setLoading(false)
  }

  const filtered = providers.filter((p) => {
    const matchesName = nameQuery === '' || p.full_name?.toLowerCase().includes(nameQuery.toLowerCase())
    const matchesCity = cityQuery === '' || p.city?.toLowerCase().includes(cityQuery.toLowerCase())
    return matchesName && matchesCity
  })

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Nav ── */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary-600" fill="currentColor" />
            <span className="text-lg font-bold text-gray-900">
              Care<span className="text-primary-600">Connect</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-sm text-gray-600 hover:text-gray-900 font-medium">
              A minha conta
            </Link>
            <Link to="/login" className="btn-primary text-sm py-2 px-4">
              Entrar
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero banner ── */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-6">
            Encontra o profissional ideal
          </h1>

          {/* Search row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Nome do profissional..."
                className="input-field pl-11 py-3.5 rounded-xl shadow-sm"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
              />
            </div>
            <div className="relative sm:w-56">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cidade..."
                className="input-field pl-11 py-3.5 rounded-xl shadow-sm"
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Category filters ── */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <SlidersHorizontal className="w-4 h-4 text-gray-400" />
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all
                          ${category === cat.value
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-700'
                          }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* ── Results count ── */}
        {!loading && (
          <p className="text-sm text-gray-500 mb-5">
            {filtered.length} profissional{filtered.length !== 1 ? 'is' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* ── Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-3 bg-gray-200 rounded" />
                  <div className="h-3 bg-gray-200 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">Nenhum profissional encontrado</h3>
            <p className="text-gray-400 text-sm">Tenta outros filtros ou remove a pesquisa por cidade.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => (
              <div key={p.id} className="card-hover flex flex-col">
                {/* Card top */}
                <div className="flex items-start gap-4 mb-3">
                  <Avatar src={p.avatar_url} name={p.full_name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-gray-900 leading-tight">{p.full_name}</h3>
                      {p.hourly_rate && (
                        <span className="text-primary-600 font-bold text-sm whitespace-nowrap">
                          {formatCurrency(p.hourly_rate)}/h
                        </span>
                      )}
                    </div>
                    <span className={`${ROLE_COLOR[p.role] || 'badge-gray'} mt-1 text-xs`}>
                      {ROLE_LABEL[p.role] || p.role}
                    </span>
                    <div className="mt-1.5">
                      <StarRating rating={p.rating || 0} total={p.total_reviews || 0} />
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <p className="text-sm text-gray-500 line-clamp-2 flex-1">
                  {p.bio || 'Profissional dedicado(a) com experiência comprovada.'}
                </p>

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <MapPin className="w-3.5 h-3.5" />
                    {p.city || 'Portugal'}
                  </div>
                  <Link
                    to={`/profile/${p.id}`}
                    className="flex items-center gap-1 text-sm font-semibold text-primary-600
                               hover:text-primary-700 transition-colors"
                  >
                    Ver perfil e agendar
                    <ChevronRight className="w-4 h-4" />
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
