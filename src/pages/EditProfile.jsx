import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Camera, Upload, Save, ChevronLeft, User, CreditCard,
  CheckCircle, AlertCircle, Loader2, MapPin,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/appStore'
import { COUNTRIES, CITIES } from '../utils/locations'

const SERVICE_TYPES = [
  { value: 'caregiver', label: 'Cuidador(a) de Idosos', icon: '🧓' },
  { value: 'nurse',     label: 'Enfermeiro(a)',          icon: '🩺' },
  { value: 'cleaner',   label: 'Assistente de Limpeza',  icon: '🧹' },
]

function completionPercent(profile) {
  const fields = ['avatar_url', 'bio', 'hourly_rate', 'city', 'bank_account_value']
  const filled = fields.filter((f) => profile?.[f]).length
  return Math.round((filled / fields.length) * 100)
}

export default function EditProfile() {
  const { user, userRole } = useAppStore()
  const navigate = useNavigate()
  const avatarRef = useRef(null)

  const [profile, setProfile]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [tab, setTab]               = useState('profile')
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [success, setSuccess]       = useState(false)
  const [error, setError]           = useState(null)
  const [country, setCountry]       = useState('PT')

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    fetchProfile()
  }, [])

  async function fetchProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      setProfile(data)
      setCountry(data.country || 'PT')
    }
    setLoading(false)
  }

  async function uploadAvatar() {
    const file = avatarRef.current?.files?.[0]
    if (!file) return profile?.avatar_url || null
    const ext = file.name.split('.').pop()
    const path = `${user.id}.${ext}`
    await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const avatarUrl = await uploadAvatar()

      // Base fields that always exist
      const baseUpdate = {
        full_name:   profile.full_name,
        bio:         profile.bio,
        hourly_rate: profile.hourly_rate ? parseFloat(profile.hourly_rate) : null,
        role:        profile.role,
        city:        profile.city,
        country:     profile.country || 'PT',
        location:    profile.location,
        avatar_url:  avatarUrl,
        updated_at:  new Date().toISOString(),
      }

      // Try saving with bank account fields first
      const { error: upErr } = await supabase
        .from('profiles')
        .update({
          ...baseUpdate,
          bank_account_type:  profile.bank_account_type  ?? null,
          bank_account_value: profile.bank_account_value ?? null,
          bank_account_name:  profile.bank_account_name  ?? null,
          address:            profile.address            ?? null,
        })
        .eq('id', user.id)

      if (upErr) {
        // If bank account columns don't exist yet, fallback to base fields only
        if (upErr.message?.includes('bank_account') || upErr.message?.includes('schema cache')) {
          const { error: fallbackErr } = await supabase
            .from('profiles')
            .update(baseUpdate)
            .eq('id', user.id)
          if (fallbackErr) throw new Error(fallbackErr.message)
          setError('Perfil guardado, mas os campos bancários ainda não estão activos. Executa a migração SQL no Supabase.')
        } else {
          throw new Error(upErr.message)
        }
      }

      setProfile((p) => ({ ...p, avatar_url: avatarUrl }))
      if (!upErr) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  const isProvider = userRole && userRole !== 'client' && userRole !== 'admin'
  const pct = isProvider ? completionPercent(profile) : null
  const bankMissing = isProvider && !profile?.bank_account_value

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/dashboard"
            className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center
                       hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-extrabold text-gray-900">Editar Perfil</h1>
        </div>

        {/* Profile completion bar (providers only) */}
        {isProvider && (
          <div className={`card mb-5 ${bankMissing ? 'border-amber-200 bg-amber-50' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-800">
                Perfil {pct}% completo
              </span>
              {pct === 100 ? (
                <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                  <CheckCircle className="w-3.5 h-3.5" /> Completo
                </span>
              ) : (
                <span className="text-xs text-amber-700 font-medium">{100 - pct}% em falta</span>
              )}
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-amber-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {bankMissing && (
              <p className="text-xs text-amber-700 mt-2">
                Adiciona a conta bancária para começar a receber pagamentos.
              </p>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
          {[
            { key: 'profile', label: 'Dados do Perfil',   Icon: User },
            { key: 'bank',    label: 'Conta Bancária',     Icon: CreditCard },
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all
                          ${tab === key ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Profile tab */}
        {tab === 'profile' && (
          <div className="space-y-5">
            {/* Avatar */}
            <div className="card flex flex-col items-center gap-3 py-8">
              <div
                className="w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow
                            flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => avatarRef.current?.click()}
              >
                {avatarPreview || profile?.avatar_url ? (
                  <img
                    src={avatarPreview || profile.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <button
                type="button"
                onClick={() => avatarRef.current?.click()}
                className="flex items-center gap-1.5 text-sm text-primary-600 font-medium hover:underline"
              >
                <Upload className="w-4 h-4" />
                {(avatarPreview || profile?.avatar_url) ? 'Alterar foto' : 'Adicionar foto'}
              </button>
              <input
                ref={avatarRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) setAvatarPreview(URL.createObjectURL(f))
                }}
              />
            </div>

            <div className="card space-y-4">
              <div>
                <label className="input-label">Nome completo</label>
                <input
                  className="input-field"
                  value={profile?.full_name || ''}
                  onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                />
              </div>

              {isProvider && (
                <>
                  <div>
                    <label className="input-label">Tipo de serviço</label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {SERVICE_TYPES.map((t) => (
                        <label
                          key={t.value}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all
                                      ${profile?.role === t.value
                                        ? 'border-primary-500 bg-primary-50'
                                        : 'border-gray-200 bg-white hover:border-gray-300'}`}
                        >
                          <input
                            type="radio"
                            className="sr-only"
                            checked={profile?.role === t.value}
                            onChange={() => setProfile((p) => ({ ...p, role: t.value }))}
                          />
                          <span className="text-2xl">{t.icon}</span>
                          <span className="text-xs font-medium text-gray-700 text-center leading-tight">{t.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="input-label">Preço por hora (€)</label>
                    <input
                      type="number"
                      step="0.50"
                      min="1"
                      className="input-field"
                      value={profile?.hourly_rate || ''}
                      onChange={(e) => setProfile((p) => ({ ...p, hourly_rate: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="input-label">Bio / Descrição</label>
                    <textarea
                      rows={4}
                      className="input-field resize-none"
                      placeholder="Experiência, certificações, especialidades..."
                      value={profile?.bio || ''}
                      onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">País</label>
                  <select
                    className="input-field"
                    value={profile?.country || 'PT'}
                    onChange={(e) => {
                      setCountry(e.target.value)
                      setProfile((p) => ({ ...p, country: e.target.value, city: '' }))
                    }}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="input-label">Cidade</label>
                  <select
                    className="input-field"
                    value={profile?.city || ''}
                    onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
                  >
                    <option value="">Seleciona...</option>
                    {(CITIES[country] || CITIES.PT).map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="input-label">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-500" />
                    Morada completa
                  </span>
                </label>
                <input
                  className="input-field"
                  placeholder="Rua, número, código postal"
                  value={profile?.location || ''}
                  onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )}

        {/* Bank account tab */}
        {tab === 'bank' && (
          <div className="card space-y-5">
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
              <CreditCard className="w-4 h-4 flex-shrink-0" />
              Os dados bancários são usados para transferir os seus pagamentos via Stripe Connect.
              Os dados são encriptados e nunca partilhados com clientes.
            </div>

            <div>
              <label className="input-label">Tipo de conta</label>
              <div className="grid grid-cols-2 gap-3 mt-1">
                {[
                  { value: 'iban', label: '🏦 IBAN', desc: 'Portugal / Europa' },
                  { value: 'pix',  label: '⚡ Chave PIX', desc: 'Brasil' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex flex-col gap-0.5 p-4 rounded-xl border-2 cursor-pointer transition-all
                                ${profile?.bank_account_type === opt.value
                                  ? 'border-primary-500 bg-primary-50'
                                  : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      checked={profile?.bank_account_type === opt.value}
                      onChange={() => setProfile((p) => ({ ...p, bank_account_type: opt.value, bank_account_value: '' }))}
                    />
                    <span className="font-semibold text-gray-800">{opt.label}</span>
                    <span className="text-xs text-gray-500">{opt.desc}</span>
                  </label>
                ))}
              </div>
            </div>

            {profile?.bank_account_type === 'iban' && (
              <div>
                <label className="input-label">IBAN *</label>
                <input
                  className="input-field font-mono tracking-wider"
                  placeholder="PT50 0000 0000 0000 0000 0000 0"
                  value={profile?.bank_account_value || ''}
                  onChange={(e) => setProfile((p) => ({ ...p, bank_account_value: e.target.value.toUpperCase() }))}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Formato: PT50 seguido de 21 dígitos.
                </p>
              </div>
            )}

            {profile?.bank_account_type === 'pix' && (
              <div>
                <label className="input-label">Chave PIX *</label>
                <input
                  className="input-field"
                  placeholder="CPF, email, telefone ou chave aleatória"
                  value={profile?.bank_account_value || ''}
                  onChange={(e) => setProfile((p) => ({ ...p, bank_account_value: e.target.value }))}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Insere a chave PIX registada no teu banco.
                </p>
              </div>
            )}

            {!profile?.bank_account_type && (
              <p className="text-center text-sm text-gray-400 py-4">
                Seleciona o tipo de conta para continuar.
              </p>
            )}

            {profile?.bank_account_value && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                Conta bancária configurada. Podes receber pagamentos.
              </div>
            )}
          </div>
        )}

        {/* Feedback */}
        {error && (
          <div className="flex items-center gap-2 mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 mt-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Perfil guardado com sucesso!
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full mt-5 py-4 text-base disabled:opacity-60"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              A guardar...
            </span>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Guardar Alterações
            </>
          )}
        </button>
      </main>
    </div>
  )
}
