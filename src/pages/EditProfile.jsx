import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Camera, Upload, Save, ChevronLeft, User, CreditCard,
  CheckCircle, AlertCircle, Loader2, MapPin, CalendarDays, Hash,
  Phone, Trash2, Wallet,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/appStore'
import { COUNTRIES, CITIES } from '../utils/locations'
import { CLEANING_TYPES, SERVICE_TYPES, SERVICE_TYPE_LABELS, LICENSE_REQUIRED, getLicenseLabel } from '../utils/constants'
import { stripePromise } from '../lib/stripe'

const DAYS_SCHEDULE = [
  { day: 1, label: 'Segunda-feira' },
  { day: 2, label: 'Terça-feira' },
  { day: 3, label: 'Quarta-feira' },
  { day: 4, label: 'Quinta-feira' },
  { day: 5, label: 'Sexta-feira' },
  { day: 6, label: 'Sábado' },
  { day: 0, label: 'Domingo' },
]

const TIME_OPTIONS = Array.from({ length: 25 }, (_, i) => {
  const h = String(i).padStart(2, '0')
  return `${h}:00`
})

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

  // Availability tab state
  const [schedule, setSchedule] = useState(
    DAYS_SCHEDULE.map((d) => ({ ...d, active: false, start: '09:00', end: '17:00' }))
  )
  const [availLoading, setAvailLoading] = useState(false)
  const [availSaving, setAvailSaving]   = useState(false)
  const [availSuccess, setAvailSuccess] = useState(false)

  // Profile 2 state — slot 2 in provider_services (provider only)
  const [profile2, setProfile2] = useState({
    service_type: '', hourly_rate: '', daily_rate: '', description: '', nursing_license: '', nursing_license_country: 'PT',
  })

  // Payment state (clients)
  const [cardName, setCardName]         = useState('')
  const [cardSaved, setCardSaved]       = useState(false)
  const [cardError, setCardError]       = useState(null)
  const [paymentSaving, setPaymentSaving] = useState(false)
  const [mbwaySaving, setMbwaySaving]   = useState(false)
  const [pixSaving, setPixSaving]       = useState(false)

  // Stripe card element refs
  const cardContainerRef  = useRef(null)
  const stripeCardRef     = useRef(null)
  const stripeInstanceRef = useRef(null)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    fetchProfile()
  }, [])

  // Load availability once userRole resolves
  useEffect(() => {
    if (userRole === 'professional') loadAvailability()
  }, [userRole]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      // Generate a professional ID on first load if one wasn't created at signup
      if (!data.professional_id_number && (data.role === 'professional' || userRole === 'professional')) {
        const newId = Math.floor(100000 + Math.random() * 900000)
        await supabase.from('profiles').update({ professional_id_number: newId }).eq('id', user.id)
        data.professional_id_number = newId
        console.log('[Profile] generated professional_id_number:', newId)
      }
      setProfile(data)
      setCountry(data.country || 'PT')
      // Load Perfil 2 from provider_services (Perfil 1 data is in profiles already)
      if (data.role === 'professional') loadSlots()
    }
    setLoading(false)
  }

  async function loadSlots() {
    // Perfil 1 comes from the profiles table (already loaded in fetchProfile).
    // Only load Perfil 2 from provider_services slot=2.
    const { data: s2, error } = await supabase
      .from('provider_services')
      .select('service_type, hourly_rate, daily_rate, description, nursing_license, nursing_license_country')
      .eq('professional_id', user.id)
      .eq('slot', 2)
      .maybeSingle()

    if (error) { console.error('[EditProfile] loadSlots slot 2 error:', error); return }
    console.log('[EditProfile] loadSlots slot2 raw:', s2)

    if (s2) {
      setProfile2({
        service_type:            s2.service_type            || '',
        hourly_rate:             s2.hourly_rate             ?? '',
        daily_rate:              s2.daily_rate              ?? '',
        description:             s2.description             || '',
        nursing_license:         s2.nursing_license         || '',
        nursing_license_country: s2.nursing_license_country || 'PT',
      })
    }
  }

  // Mount/unmount Stripe card element when payment tab is active
  useEffect(() => {
    if (tab !== 'payment') {
      // Unmount card element when leaving payment tab
      if (stripeCardRef.current) {
        stripeCardRef.current.unmount()
        stripeCardRef.current = null
      }
      return
    }
    if (!cardContainerRef.current || stripeCardRef.current) return

    let active = true
    stripePromise.then((stripe) => {
      if (!active || !stripe || !cardContainerRef.current || stripeCardRef.current) return
      stripeInstanceRef.current = stripe
      const elements = stripe.elements()
      const card = elements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#374151',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            '::placeholder': { color: '#9ca3af' },
          },
          invalid: { color: '#ef4444' },
        },
      })
      card.mount(cardContainerRef.current)
      stripeCardRef.current = card
    })
    return () => {
      active = false
      if (stripeCardRef.current) {
        stripeCardRef.current.unmount()
        stripeCardRef.current = null
      }
    }
  }, [tab])

  // Load availability when switching to that tab
  useEffect(() => {
    if (tab !== 'availability' || !user) return
    loadAvailability()
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadAvailability() {
    setAvailLoading(true)
    const { data } = await supabase
      .from('professional_availability')
      .select('*')
      .eq('professional_id', user.id)
      .eq('is_active', true)

    if (data) {
      setSchedule((prev) =>
        prev.map((day) => {
          const found = data.find((d) => d.day_of_week === day.day)
          return found
            ? { ...day, active: true, start: found.start_time.slice(0, 5), end: found.end_time.slice(0, 5) }
            : { ...day, active: false }
        })
      )
    }
    setAvailLoading(false)
  }

  async function handleSaveAvailability() {
    setAvailSaving(true)
    setError(null)
    try {
      // Replace all entries for this professional
      await supabase
        .from('professional_availability')
        .delete()
        .eq('professional_id', user.id)

      const toInsert = schedule
        .filter((d) => d.active)
        .map((d) => ({
          professional_id: user.id,
          day_of_week:     d.day,
          start_time:      d.start,
          end_time:        d.end,
          is_active:       true,
        }))

      if (toInsert.length) {
        const { error: insErr } = await supabase
          .from('professional_availability')
          .insert(toInsert)
        if (insErr) throw new Error(insErr.message)
      }

      setAvailSuccess(true)
      setTimeout(() => setAvailSuccess(false), 4000)
      // Reload from DB to confirm saved values populate the time inputs
      await loadAvailability()
    } catch (e) {
      setError(e.message)
    } finally {
      setAvailSaving(false)
    }
  }

  async function uploadAvatar() {
    const file = avatarRef.current?.files?.[0]
    if (!file) return { url: profile?.avatar_url || null, uploadError: null }
    const ext = file.name.split('.').pop()
    const path = `${user.id}.${ext}`
    console.log('[Avatar] uploading to bucket "avatars", path:', path)
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    console.log('[Avatar] upload result:', { uploadData, uploadErr })
    if (uploadErr) {
      console.error('[Avatar] upload failed:', uploadErr.message)
      return { url: profile?.avatar_url || null, uploadError: uploadErr.message }
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    console.log('[Avatar] public URL:', urlData.publicUrl)
    return { url: urlData.publicUrl, uploadError: null }
  }

  // Save Perfil 2 to provider_services slot=2 — explicit SELECT then UPDATE or INSERT
  async function saveSlot2(fields) {
    console.log('[EditProfile] saveSlot2 fields:', { professional_id: user.id, ...fields })

    const { data: existing, error: fetchErr } = await supabase
      .from('provider_services')
      .select('id')
      .eq('professional_id', user.id)
      .eq('slot', 2)
      .maybeSingle()

    if (fetchErr) { console.error('[EditProfile] slot 2 fetch error:', fetchErr); return }
    console.log('[EditProfile] slot 2 existing row:', existing)

    if (existing) {
      const { error } = await supabase
        .from('provider_services')
        .update(fields)
        .eq('id', existing.id)
      if (error) console.error('[EditProfile] slot 2 update error:', error)
      else console.log('[EditProfile] slot 2 updated OK')
    } else {
      const { error } = await supabase
        .from('provider_services')
        .insert({ professional_id: user.id, slot: 2, is_available: true, ...fields })
      if (error) console.error('[EditProfile] slot 2 insert error:', error)
      else console.log('[EditProfile] slot 2 inserted OK')
    }
  }

  async function handleSaveCard() {
    if (!stripeInstanceRef.current || !stripeCardRef.current) return
    setPaymentSaving(true)
    setCardError(null)
    try {
      const { paymentMethod, error: stripeErr } = await stripeInstanceRef.current.createPaymentMethod({
        type: 'card',
        card: stripeCardRef.current,
        billing_details: { name: cardName || undefined },
      })
      if (stripeErr) throw new Error(stripeErr.message)

      const { brand, last4, exp_month, exp_year } = paymentMethod.card
      const brandLabel = brand.charAt(0).toUpperCase() + brand.slice(1)
      const summary = `${brandLabel} **** ${last4} — ${String(exp_month).padStart(2, '0')}/${exp_year}`

      const { error: dbErr } = await supabase.from('profiles').update({
        default_payment_method_id: paymentMethod.id,
        stripe_card_summary: summary,
      }).eq('id', user.id)
      if (dbErr) throw new Error(dbErr.message)

      setProfile((p) => ({ ...p, default_payment_method_id: paymentMethod.id, stripe_card_summary: summary }))
      setCardName('')
      setCardSaved(true)
      setTimeout(() => setCardSaved(false), 4000)
    } catch (e) {
      setCardError(e.message)
    } finally {
      setPaymentSaving(false)
    }
  }

  async function handleDeleteCard() {
    const { error } = await supabase.from('profiles').update({
      default_payment_method_id: null,
      stripe_card_summary: null,
    }).eq('id', user.id)
    if (!error) setProfile((p) => ({ ...p, default_payment_method_id: null, stripe_card_summary: null }))
  }

  async function handleSaveMbway() {
    setMbwaySaving(true)
    const { error } = await supabase.from('profiles').update({
      mbway_phone: profile?.mbway_phone || null,
    }).eq('id', user.id)
    setMbwaySaving(false)
    if (!error) {
      setCardSaved(true)
      setTimeout(() => setCardSaved(false), 3000)
    }
  }

  async function handleSavePix() {
    setPixSaving(true)
    const { error } = await supabase.from('profiles').update({
      pix_key: profile?.pix_key || null,
    }).eq('id', user.id)
    setPixSaving(false)
    if (!error) {
      setCardSaved(true)
      setTimeout(() => setCardSaved(false), 3000)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const { url: avatarUrl, uploadError } = await uploadAvatar()
      if (uploadError) {
        // Show warning but continue saving — photo upload failure shouldn't block profile save
        setError(`Foto não guardada: ${uploadError}`)
      }

      // Base fields that always exist in the profiles table
      const baseUpdate = {
        full_name:    profile.full_name,
        bio:          profile.bio,
        hourly_rate:  profile.hourly_rate ? parseFloat(profile.hourly_rate) : null,
        service_type: profile.service_type ?? null,
        city:         profile.city,
        country:      profile.country || 'PT',
        location:     profile.location,
        avatar_url:   avatarUrl,
        phone:        profile.phone        ?? null,
        tax_id:       profile.tax_id       ?? null,
        tax_id_type:  profile.tax_id_type  ?? null,
        updated_at:   new Date().toISOString(),
      }

      // Derive the correct bank_account_type from country so it's always in sync
      const bankType =
        profile.country === 'PT' ? 'iban' :
        profile.country === 'BR' ? 'pix'  :
        profile.bank_account_type ?? null

      // Extended fields — added by migrations; may not exist in older DB schemas
      const extendedUpdate = {
        bank_account_type:       bankType,
        bank_account_value:      profile.bank_account_value   ?? null,
        bank_account_name:       profile.bank_account_name    ?? null,
        address:                 profile.address              ?? null,
        daily_rate:              profile.daily_rate ? parseFloat(profile.daily_rate) : null,
        cleaning_types:          profile.cleaning_types       ?? null,
        cleaning_description:    profile.cleaning_description ?? null,
        nursing_license:         profile.nursing_license      ?? null,
        nursing_license_country: profile.country              ?? 'PT',
        custom_profession:       profile.custom_profession    ?? null,
      }

      console.log('[Profile] saving — nursing_license:', profile.nursing_license, '| service_type:', profile.service_type, '| avatar_url:', avatarUrl)

      const { error: upErr } = await supabase
        .from('profiles')
        .update({ ...baseUpdate, ...extendedUpdate })
        .eq('id', user.id)
      console.log('[Profile] update result:', { upErr })

      if (upErr) {
        // Extended columns may not exist yet — save base fields first (must succeed)
        const { error: baseErr } = await supabase
          .from('profiles')
          .update(baseUpdate)
          .eq('id', user.id)
        if (baseErr) throw new Error(baseErr.message)

        // Retry each extended group independently — errors are non-fatal (migration may not be run)
        await supabase.from('profiles').update({
          bank_account_type:  bankType,
          bank_account_value: profile.bank_account_value ?? null,
          bank_account_name:  profile.bank_account_name  ?? null,
        }).eq('id', user.id)

        await supabase.from('profiles').update({
          daily_rate:              profile.daily_rate ? parseFloat(profile.daily_rate) : null,
          cleaning_types:          profile.cleaning_types       ?? null,
          cleaning_description:    profile.cleaning_description ?? null,
          nursing_license:         profile.nursing_license      ?? null,
          nursing_license_country: profile.country              ?? 'PT',
          custom_profession:       profile.custom_profession    ?? null,
        }).eq('id', user.id)
      }

      // Perfil 1 is saved via profiles table update above (no provider_services row needed).
      // Save Perfil 2 to provider_services slot=2 (professionals only, when service selected).
      if (isProvider && profile2.service_type) {
        const nl2 = LICENSE_REQUIRED.has(profile2.service_type)
        await saveSlot2({
          service_type:            profile2.service_type,
          hourly_rate:             profile2.hourly_rate ? parseFloat(profile2.hourly_rate) : null,
          daily_rate:              profile2.daily_rate  ? parseFloat(profile2.daily_rate)  : null,
          description:             profile2.description || null,
          nursing_license:         nl2 ? (profile2.nursing_license?.trim() || null) : null,
          nursing_license_country: nl2 ? (profile2.nursing_license_country || 'PT')  : null,
        })
      }

      setProfile((p) => ({ ...p, avatar_url: avatarUrl }))
      if (!uploadError) setError(null)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)

      // Reload both profile and slots from DB to confirm persisted values
      const { data: fresh } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (fresh) {
        setProfile(fresh)
        setCountry(fresh.country || 'PT')
      }
      if (isProvider) loadSlots()
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

  const isProvider = userRole === 'professional'
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
            { key: 'profile',      label: 'Perfil',          Icon: User },
            { key: 'bank',         label: 'Conta Bancária',   Icon: CreditCard },
            ...(isProvider ? [{ key: 'availability', label: 'Disponibilidade', Icon: CalendarDays }] : []),
            ...(!isProvider ? [{ key: 'payment', label: 'Pagamento', Icon: Wallet }] : []),
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

              <div>
                <label className="input-label">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-500" />
                    Número de telefone
                  </span>
                </label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder={profile?.country === 'BR' ? '+55 11 91234-5678' : '+351 912 345 678'}
                  value={profile?.phone || ''}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>

              {/* Tax ID — NIF/NIPC for PT, CPF/CNPJ for BR */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">
                    {profile?.country === 'BR' ? 'Tipo de documento' : 'Tipo de NIF'}
                  </label>
                  <select
                    className="input-field"
                    value={profile?.tax_id_type || ''}
                    onChange={(e) => setProfile((p) => ({ ...p, tax_id_type: e.target.value }))}
                  >
                    <option value="">Seleciona...</option>
                    {(profile?.country === 'BR'
                      ? [{ value: 'CPF', label: 'CPF' }, { value: 'CNPJ', label: 'CNPJ' }]
                      : [{ value: 'NIF', label: 'NIF' }, { value: 'NIPC', label: 'NIPC' }]
                    ).map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="input-label">
                    {profile?.tax_id_type || (profile?.country === 'BR' ? 'CPF/CNPJ' : 'NIF/NIPC')}
                  </label>
                  <input
                    className="input-field"
                    placeholder={profile?.country === 'BR' ? '000.000.000-00' : '000000000'}
                    value={profile?.tax_id || ''}
                    onChange={(e) => setProfile((p) => ({ ...p, tax_id: e.target.value }))}
                  />
                </div>
              </div>

              {isProvider && (
                <>
                  {/* Professional ID — read-only */}
                  {profile?.professional_id_number && (
                    <div className="flex items-center gap-2 bg-primary-50 border border-primary-100 rounded-xl px-4 py-3">
                      <Hash className="w-4 h-4 text-primary-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-primary-600 font-medium uppercase tracking-wide">ID do Profissional</p>
                        <p className="text-lg font-extrabold text-primary-700 tracking-widest">
                          {profile.professional_id_number}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Profession / service type */}
                  <div>
                    <label className="input-label">Profissão / Tipo de serviço</label>
                    <select
                      className="input-field"
                      value={profile?.service_type || ''}
                      onChange={(e) => setProfile((p) => ({ ...p, service_type: e.target.value }))}
                    >
                      <option value="" disabled>Seleciona a tua profissão...</option>
                      <optgroup label="── Saúde e Cuidado ──">
                        {SERVICE_TYPES.filter((t) => t.group === 'health').map((t) => (
                          <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="── Serviços Gerais ──">
                        {SERVICE_TYPES.filter((t) => t.group === 'general').map((t) => (
                          <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* "Outro" — custom profession name */}
                  {profile?.service_type === 'other' && (
                    <div>
                      <label className="input-label">Qual é a tua profissão?</label>
                      <input
                        className="input-field"
                        placeholder="Ex: Técnico de ar condicionado..."
                        value={profile?.custom_profession || ''}
                        onChange={(e) => setProfile((p) => ({ ...p, custom_profession: e.target.value }))}
                      />
                    </div>
                  )}

                  {/* License number — health professions only; loaded from provider_services slot 1 */}
                  {LICENSE_REQUIRED.has(profile?.service_type) && (
                    <div>
                      <label className="input-label">
                        {getLicenseLabel(profile?.country || country, profile?.service_type)}
                      </label>
                      <input
                        className="input-field"
                        placeholder={profile?.country === 'BR' ? 'Ex: COREN-SP 123456' : 'Ex: 7-E-123456'}
                        value={profile?.nursing_license || ''}
                        onChange={(e) => setProfile((p) => ({ ...p, nursing_license: e.target.value }))}
                      />
                    </div>
                  )}

                  {/* Hourly rate + daily rate — always side by side */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="input-label">⏱ Valor por hora (€)</label>
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
                      <label className="input-label">📅 Valor por dia (€)</label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        className="input-field"
                        placeholder="Ex: 80"
                        value={profile?.daily_rate || ''}
                        onChange={(e) => setProfile((p) => ({ ...p, daily_rate: e.target.value }))}
                      />
                    </div>
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

                  {/* Cleaning-specific fields */}
                  {profile?.service_type === 'cleaner' && (
                    <>
                      <div>
                        <label className="input-label">Tipos de limpeza oferecida</label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          {CLEANING_TYPES.map((type) => {
                            const checked = (profile?.cleaning_types || []).includes(type.value)
                            return (
                              <label
                                key={type.value}
                                className={`flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all
                                            ${checked ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
                              >
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0
                                                 ${checked ? 'bg-primary-500 border-primary-500' : 'border-gray-300'}`}>
                                  {checked && (
                                    <svg viewBox="0 0 10 8" className="w-2.5 h-2" fill="none">
                                      <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  )}
                                </div>
                                <span className="text-xs font-medium text-gray-700">{type.label}</span>
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={checked}
                                  onChange={(e) =>
                                    setProfile((p) => ({
                                      ...p,
                                      cleaning_types: e.target.checked
                                        ? [...(p.cleaning_types || []), type.value]
                                        : (p.cleaning_types || []).filter((v) => v !== type.value),
                                    }))
                                  }
                                />
                              </label>
                            )
                          })}
                        </div>
                      </div>
                      <div>
                        <label className="input-label">Descrição dos serviços de limpeza</label>
                        <textarea
                          rows={3}
                          className="input-field resize-none"
                          placeholder="Equipamentos, metodologia, o que está incluído..."
                          value={profile?.cleaning_description || ''}
                          onChange={(e) => setProfile((p) => ({ ...p, cleaning_description: e.target.value }))}
                        />
                      </div>
                    </>
                  )}
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

            {/* Perfil 2 — second service slot */}
            {isProvider && (
              <div className="card space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                  <span className="text-base">📋</span>
                  <h3 className="font-bold text-gray-900">Perfil 2</h3>
                  <span className="text-xs text-gray-400">— segundo serviço (opcional)</span>
                </div>

                <div>
                  <label className="input-label">Profissão / Tipo de serviço</label>
                  <select
                    className="input-field"
                    value={profile2.service_type}
                    onChange={(e) => setProfile2((p) => ({ ...p, service_type: e.target.value }))}
                  >
                    <option value="">Nenhum (não configurado)</option>
                    <optgroup label="── Saúde e Cuidado ──">
                      {SERVICE_TYPES.filter((t) => t.group === 'health').map((t) => (
                        <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="── Serviços Gerais ──">
                      {SERVICE_TYPES.filter((t) => t.group === 'general' && t.value !== 'other').map((t) => (
                        <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {profile2.service_type && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">⏱ Valor por hora (€)</label>
                        <input
                          type="number" step="0.50" min="1" className="input-field" placeholder="15.00"
                          value={profile2.hourly_rate}
                          onChange={(e) => setProfile2((p) => ({ ...p, hourly_rate: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="input-label">📅 Valor por dia (€)</label>
                        <input
                          type="number" step="1" min="1" className="input-field" placeholder="80"
                          value={profile2.daily_rate || ''}
                          onChange={(e) => setProfile2((p) => ({ ...p, daily_rate: e.target.value }))}
                        />
                      </div>
                    </div>

                    {LICENSE_REQUIRED.has(profile2.service_type) && (
                      <div className="space-y-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <div>
                          <label className="input-label">
                            {getLicenseLabel(profile2.nursing_license_country || country, profile2.service_type)}
                          </label>
                          <input
                            type="text" className="input-field"
                            placeholder={profile2.nursing_license_country === 'BR' ? 'Ex: COREN-SP 123456' : 'Ex: 7-E-123456'}
                            value={profile2.nursing_license}
                            onChange={(e) => setProfile2((p) => ({ ...p, nursing_license: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="input-label">País da licença</label>
                          <select
                            className="input-field"
                            value={profile2.nursing_license_country}
                            onChange={(e) => setProfile2((p) => ({ ...p, nursing_license_country: e.target.value }))}
                          >
                            <option value="PT">🇵🇹 Portugal</option>
                            <option value="BR">🇧🇷 Brasil</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="input-label">Descrição do serviço</label>
                      <textarea
                        rows={3} className="input-field resize-none text-sm"
                        placeholder="O que inclui este serviço?"
                        value={profile2.description}
                        onChange={(e) => setProfile2((p) => ({ ...p, description: e.target.value }))}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bank account tab */}
        {tab === 'bank' && (() => {
          // Derive bank type from country — PT=IBAN, BR=PIX, others=user choice
          const countryBankType =
            profile?.country === 'PT' ? 'iban' :
            profile?.country === 'BR' ? 'pix'  : null
          const effectiveType = countryBankType ?? profile?.bank_account_type

          return (
          <div className="card space-y-5">
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
              <CreditCard className="w-4 h-4 flex-shrink-0" />
              Os dados bancários são usados para transferir os seus pagamentos.
              Os dados são encriptados e nunca partilhados com clientes.
            </div>

            {/* Country-locked type hint */}
            {countryBankType && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                <span>{countryBankType === 'iban' ? '🏦' : '⚡'}</span>
                {countryBankType === 'iban'
                  ? 'Conta IBAN — opção disponível para Portugal.'
                  : 'Chave PIX — opção disponível para o Brasil.'}
              </div>
            )}

            {/* Type selector — only for non-PT/BR countries */}
            {!countryBankType && (
              <div>
                <label className="input-label">Tipo de conta</label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  {[
                    { value: 'iban', label: '🏦 IBAN',      desc: 'Portugal / Europa' },
                    { value: 'pix',  label: '⚡ Chave PIX', desc: 'Brasil' },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex flex-col gap-0.5 p-4 rounded-xl border-2 cursor-pointer transition-all
                                  ${effectiveType === opt.value
                                    ? 'border-primary-500 bg-primary-50'
                                    : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        checked={effectiveType === opt.value}
                        onChange={() => setProfile((p) => ({ ...p, bank_account_type: opt.value, bank_account_value: '' }))}
                      />
                      <span className="font-semibold text-gray-800">{opt.label}</span>
                      <span className="text-xs text-gray-500">{opt.desc}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {effectiveType === 'iban' && (
              <div>
                <label className="input-label">IBAN *</label>
                <input
                  className="input-field font-mono tracking-wider"
                  placeholder="PT50 0000 0000 0000 0000 0000 0"
                  value={profile?.bank_account_value || ''}
                  onChange={(e) => setProfile((p) => ({ ...p, bank_account_type: 'iban', bank_account_value: e.target.value.toUpperCase() }))}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Formato: PT50 seguido de 21 dígitos.
                </p>
              </div>
            )}

            {effectiveType === 'pix' && (
              <div>
                <label className="input-label">Chave PIX *</label>
                <input
                  className="input-field"
                  placeholder="CPF, email, telefone ou chave aleatória"
                  value={profile?.bank_account_value || ''}
                  onChange={(e) => setProfile((p) => ({ ...p, bank_account_type: 'pix', bank_account_value: e.target.value }))}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Insere a chave PIX registada no teu banco.
                </p>
              </div>
            )}

            {!effectiveType && (
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
          )
        })()}

        {/* Payment methods tab (clients only) */}
        {tab === 'payment' && (
          <div className="space-y-5">

            {/* ── Credit Card (Stripe) ── */}
            <div className="card space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                <CreditCard className="w-4 h-4 text-primary-600" />
                <h3 className="font-bold text-gray-900">Cartão de crédito / débito</h3>
              </div>

              {profile?.stripe_card_summary ? (
                /* Saved card display */
                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-primary-600" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{profile.stripe_card_summary}</p>
                      <p className="text-xs text-emerald-600 font-medium">✓ Cartão guardado</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteCard}
                    className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Remover cartão"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* Card entry form */
                <div className="space-y-3">
                  <div>
                    <label className="input-label">Nome no cartão</label>
                    <input
                      className="input-field"
                      placeholder="Nome como aparece no cartão"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="input-label">Dados do cartão</label>
                    <div
                      ref={cardContainerRef}
                      className="input-field py-3.5"
                      style={{ minHeight: '46px' }}
                    />
                  </div>

                  {cardError && (
                    <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {cardError}
                    </div>
                  )}
                  {cardSaved && (
                    <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      Cartão guardado com sucesso!
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveCard}
                    disabled={paymentSaving}
                    className="btn-primary w-full py-3 disabled:opacity-60"
                  >
                    {paymentSaving ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        A guardar cartão...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Guardar Cartão
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* ── MB WAY (Portugal only) ── */}
            {(profile?.country === 'PT' || !profile?.country) && (
              <div className="card space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                  <span className="text-base">📱</span>
                  <h3 className="font-bold text-gray-900">MB WAY</h3>
                  <span className="text-xs text-gray-400">— Portugal</span>
                </div>
                <p className="text-xs text-gray-500">
                  Introduz o número de telemóvel associado à tua conta MB WAY para pagamentos rápidos.
                </p>
                <div>
                  <label className="input-label">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-500" />
                      Telemóvel MB WAY
                    </span>
                  </label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="+351 912 345 678"
                    value={profile?.mbway_phone || ''}
                    onChange={(e) => setProfile((p) => ({ ...p, mbway_phone: e.target.value }))}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveMbway}
                  disabled={mbwaySaving}
                  className="btn-primary w-full py-3 disabled:opacity-60"
                >
                  {mbwaySaving ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      A guardar...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Save className="w-4 h-4" />
                      Guardar MB WAY
                    </span>
                  )}
                </button>
                {profile?.mbway_phone && (
                  <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    MB WAY configurado: {profile.mbway_phone}
                  </div>
                )}
              </div>
            )}

            {/* ── PIX (Brasil only) ── */}
            {profile?.country === 'BR' && (
              <div className="card space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                  <span className="text-base">⚡</span>
                  <h3 className="font-bold text-gray-900">PIX</h3>
                  <span className="text-xs text-gray-400">— Brasil</span>
                </div>
                <p className="text-xs text-gray-500">
                  Introduz a tua chave PIX para receber pagamentos instantâneos.
                </p>
                <div>
                  <label className="input-label">Chave PIX</label>
                  <input
                    className="input-field"
                    placeholder="CPF, e-mail, telefone ou chave aleatória"
                    value={profile?.pix_key || ''}
                    onChange={(e) => setProfile((p) => ({ ...p, pix_key: e.target.value }))}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSavePix}
                  disabled={pixSaving}
                  className="btn-primary w-full py-3 disabled:opacity-60"
                >
                  {pixSaving ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      A guardar...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Save className="w-4 h-4" />
                      Guardar Chave PIX
                    </span>
                  )}
                </button>
                {profile?.pix_key && (
                  <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    PIX configurado: {profile.pix_key}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* Availability tab — load when first opened if not already loaded */}
        {tab === 'availability' && (
          <div className="card space-y-4">
            <p className="text-sm text-gray-500">
              Define os dias e horários em que estás disponível para receber clientes.
              Os clientes verão estes horários no teu perfil.
            </p>

            {availLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                A carregar disponibilidade...
              </div>
            ) : (
              <div className="space-y-3">
                {schedule.map((day, idx) => (
                  <div
                    key={day.day}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all
                                ${day.active ? 'border-primary-200 bg-primary-50' : 'border-gray-100 bg-white'}`}
                  >
                    {/* Toggle */}
                    <button
                      type="button"
                      onClick={() =>
                        setSchedule((prev) =>
                          prev.map((d, i) => i === idx ? { ...d, active: !d.active } : d)
                        )
                      }
                      className={`relative inline-flex w-10 h-6 rounded-full flex-shrink-0 transition-colors
                                  ${day.active ? 'bg-primary-600' : 'bg-gray-200'}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow
                                    transition-transform ${day.active ? 'translate-x-4' : 'translate-x-0'}`}
                      />
                    </button>

                    {/* Day label */}
                    <span className={`text-sm font-semibold w-32 flex-shrink-0
                                      ${day.active ? 'text-gray-900' : 'text-gray-400'}`}>
                      {day.label}
                    </span>

                    {/* Time range — selects when active, text summary when inactive */}
                    {day.active ? (
                      <div className="flex items-center gap-2 flex-1">
                        <select
                          className="input-field py-1.5 text-sm flex-1"
                          value={day.start}
                          onChange={(e) =>
                            setSchedule((prev) =>
                              prev.map((d, i) => i === idx ? { ...d, start: e.target.value } : d)
                            )
                          }
                        >
                          {TIME_OPTIONS.slice(0, -1).map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <span className="text-xs text-gray-400 flex-shrink-0">até</span>
                        <select
                          className="input-field py-1.5 text-sm flex-1"
                          value={day.end}
                          onChange={(e) =>
                            setSchedule((prev) =>
                              prev.map((d, i) => i === idx ? { ...d, end: e.target.value } : d)
                            )
                          }
                        >
                          {TIME_OPTIONS.slice(1).map((t) => (
                            <option key={t} value={t} disabled={t <= day.start}>{t}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-1">
                        {day.start} – {day.end}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {availSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 space-y-1">
                <div className="flex items-center gap-2 text-sm text-emerald-700 font-semibold">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  Disponibilidade guardada com sucesso!
                </div>
                {schedule.filter((d) => d.active).map((d) => (
                  <p key={d.day} className="text-xs text-emerald-600 pl-6">
                    {d.label}: {d.start} – {d.end}
                  </p>
                ))}
              </div>
            )}

            <button
              onClick={handleSaveAvailability}
              disabled={availSaving}
              className="btn-primary w-full py-3 text-base disabled:opacity-60"
            >
              {availSaving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  A guardar...
                </span>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Guardar Disponibilidade
                </>
              )}
            </button>
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

        {/* Save button — only for profile and bank tabs */}
        {tab !== 'availability' && tab !== 'services' && tab !== 'payment' && <button
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
        </button>}
      </main>
    </div>
  )
}
