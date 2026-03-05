import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon, Star, MapPin, Filter } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatRating } from '../utils/formatters'

const CATEGORIES = ['Todos', 'cuidador', 'enfermagem', 'limpeza', 'fisioterapia']

export default function Search() {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todos')

  useEffect(() => {
    fetchProviders()
  }, [category])

  const fetchProviders = async () => {
    setLoading(true)
    let q = supabase
      .from('profiles')
      .select('id, full_name, avatar_url, bio, city, hourly_rate, rating, total_reviews, role')
      .neq('role', 'client')
      .neq('role', 'admin')
      .eq('is_active', true)

    if (category !== 'Todos') {
      q = q.eq('role', category)
    }

    const { data } = await q.order('rating', { ascending: false })
    setProviders(data || [])
    setLoading(false)
  }

  const filtered = providers.filter((p) =>
    query === '' ||
    p.full_name?.toLowerCase().includes(query.toLowerCase()) ||
    p.city?.toLowerCase().includes(query.toLowerCase())
  )

  const roleLabel = { caregiver: 'Cuidador', nurse: 'Enfermeiro', cleaner: 'Limpeza', fisioterapia: 'Fisioterapeuta' }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold text-primary-600">CareConnect</Link>
          <Link to="/login" className="btn-primary text-sm">Entrar</Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Procurar por nome ou cidade..."
              className="input-field pl-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    category === cat
                      ? 'bg-primary-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">Carregando profissionais...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            Nenhum profissional encontrado. Tente outros filtros.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => (
              <Link key={p.id} to={`/profile/${p.id}`} className="card hover:shadow-md transition-shadow cursor-pointer block">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-2xl flex-shrink-0">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt={p.full_name} className="w-14 h-14 rounded-full object-cover" />
                    ) : (
                      '👤'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{p.full_name}</h3>
                    <p className="text-sm text-primary-600 font-medium">{roleLabel[p.role] || p.role}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-medium">{formatRating(p.rating)}</span>
                      <span className="text-sm text-gray-400">({p.total_reviews})</span>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-500 line-clamp-2">{p.bio || 'Profissional certificado.'}</p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <MapPin className="w-4 h-4" />
                    {p.city || 'Portugal'}
                  </div>
                  {p.hourly_rate && (
                    <span className="font-semibold text-primary-600">
                      {formatCurrency(p.hourly_rate)}/h
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
