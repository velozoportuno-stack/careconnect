import { useState, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Heart, User, Briefcase, ArrowLeft, Camera, Upload, MapPin, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { COUNTRIES, CITIES } from '../utils/locations'
import { CLEANING_TYPES, SERVICE_TYPES, LICENSE_REQUIRED, getLicenseLabel } from '../utils/constants'
import Navbar from '../components/Navbar'

function translateError(message) {
  if (!message) return 'Erro desconhecido. Tenta novamente.'
  const m = message.toLowerCase()
  if (m.includes('user already registered') || m.includes('already been registered') || m.includes('email already'))
    return '__EMAIL_EXISTS__'
  if (m.includes('password should be at least'))
    return 'A password deve ter pelo menos 6 caracteres.'
  if (m.includes('invalid email'))
    return 'Endereço de email inválido.'
  if (m.includes('database error'))
    return 'Erro ao guardar os dados. Tenta novamente em instantes.'
  if (m.includes('network') || m.includes('fetch'))
    return 'Sem ligação à internet. Verifica a tua rede e tenta novamente.'
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Demasiadas tentativas. Aguarda alguns minutos e tenta novamente.'
  return 'Erro ao criar conta. Tenta novamente.'
}

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const roleParam   = searchParams.get('role')
  const initialRole = roleParam === 'professional' ? 'professional' : roleParam === 'client' ? 'client' : null
  const [step, setStep] = useState(initialRole ? 'form' : 'role')
  const [userType, setUserType] = useState(
    initialRole === 'professional' ? 'professional' : initialRole === 'client' ? 'client' : null
  )
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [country, setCountry] = useState('PT')
  const [cleaningTypesSelected, setCleaningTypesSelected] = useState([])
  const [taxIdType, setTaxIdType] = useState('particular') // 'particular' | 'empresa'
  const [taxIdValue, setTaxIdValue] = useState('')
  const [taxIdError, setTaxIdError] = useState('')
  const avatarFileRef = useRef(null)

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    defaultValues: { country: 'PT' },
  })
  const selectedServiceType = watch('service_type')
  const needsLicense = LICENSE_REQUIRED.has(selectedServiceType)
  const isCleanerType = selectedServiceType === 'cleaner'
  const isOtherType = selectedServiceType === 'other'

  // ── Tax ID config ────────────────────────────────────────────────────────────
  const TAX_TYPE_NAME = {
    PT_particular: 'NIF', PT_empresa: 'NIPC',
    BR_particular: 'CPF', BR_empresa:  'CNPJ',
  }
  const taxTypeName = TAX_TYPE_NAME[`${country}_${taxIdType}`] || 'NIF'

  function taxIdLabel() {
    if (country === 'PT') return taxIdType === 'particular' ? 'NIF' : 'NIPC'
    return taxIdType === 'particular' ? 'CPF' : 'CNPJ'
  }

  function maskTaxId(raw) {
    const d = raw.replace(/\D/g, '')
    if (country === 'BR' && taxIdType === 'particular') {
      const s = d.slice(0, 11)
      if (s.length <= 3) return s
      if (s.length <= 6) return `${s.slice(0,3)}.${s.slice(3)}`
      if (s.length <= 9) return `${s.slice(0,3)}.${s.slice(3,6)}.${s.slice(6)}`
      return `${s.slice(0,3)}.${s.slice(3,6)}.${s.slice(6,9)}-${s.slice(9)}`
    }
    if (country === 'BR' && taxIdType === 'empresa') {
      const s = d.slice(0, 14)
      if (s.length <= 2) return s
      if (s.length <= 5) return `${s.slice(0,2)}.${s.slice(2)}`
      if (s.length <= 8) return `${s.slice(0,2)}.${s.slice(2,5)}.${s.slice(5)}`
      if (s.length <= 12) return `${s.slice(0,2)}.${s.slice(2,5)}.${s.slice(5,8)}/${s.slice(8)}`
      return `${s.slice(0,2)}.${s.slice(2,5)}.${s.slice(5,8)}/${s.slice(8,12)}-${s.slice(12)}`
    }
    // PT NIF / NIPC — 9 digits, no formatting
    return d.slice(0, 9)
  }

  function validateTaxId(val) {
    if (!val) return ''
    const digits = val.replace(/\D/g, '')
    if (country === 'PT') return digits.length === 9 ? '' : `${taxTypeName} deve ter 9 dígitos`
    if (country === 'BR' && taxIdType === 'particular') return digits.length === 11 ? '' : 'CPF deve ter 11 dígitos'
    if (country === 'BR' && taxIdType === 'empresa')    return digits.length === 14 ? '' : 'CNPJ deve ter 14 dígitos'
    return ''
  }

  function handleTaxIdChange(e) {
    const masked = maskTaxId(e.target.value)
    setTaxIdValue(masked)
    setTaxIdError(validateTaxId(masked))
  }

  function handleRoleSelect(type) {
    setUserType(type)
    setStep('form')
  }

  function handleCountryChange(e) {
    const val = e.target.value
    setCountry(val)
    setValue('country', val)
    setValue('city', '')
    setTaxIdValue('')
    setTaxIdError('')
    setTaxIdType('particular')
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (file) setAvatarPreview(URL.createObjectURL(file))
  }

  async function uploadAvatar(userId) {
    const file = avatarFileRef.current?.files?.[0]
    if (!file) return null
    const ext = file.name.split('.').pop()
    const path = `${userId}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data.publicUrl
  }

  const onSubmit = async (values) => {
    setLoading(true)
    setError(null)

    const isProfessional = userType === 'professional'
    const role = isProfessional ? 'professional' : 'client'
    const resolvedCountry = country || values.country || 'PT'

    const userData = {
      full_name: values.full_name,
      phone:     values.phone,
      city:      values.city,
      country:   resolvedCountry,
      location:  values.address || null,
      role,
      ...(isProfessional && {
        service_type: values.service_type,
        hourly_rate:  parseFloat(values.hourly_rate) || null,
        daily_rate:   parseFloat(values.daily_rate)  || null,
        bio:          values.bio || null,
        ...(isOtherType && values.custom_profession && {
          custom_profession: values.custom_profession,
        }),
        ...(needsLicense && {
          nursing_license:         values.nursing_license || null,
          nursing_license_country: resolvedCountry,
        }),
        ...(isCleanerType && {
          cleaning_types:       cleaningTypesSelected.length ? cleaningTypesSelected : null,
          cleaning_description: values.cleaning_description || null,
        }),
      }),
    }

    // Validate tax ID before submit
    if (taxIdValue) {
      const err = validateTaxId(taxIdValue)
      if (err) { setTaxIdError(err); setLoading(false); return }
    }

    if (taxIdValue) {
      userData.tax_id      = taxIdValue.replace(/\D/g, '')
      userData.tax_id_type = taxTypeName
    }

    const { data, error: signUpError } = await signUp(values.email, values.password, userData)

    if (signUpError) {
      setError(translateError(signUpError.message))
      setLoading(false)
      return
    }

    if (isProfessional && data?.user && avatarFileRef.current?.files?.[0]) {
      const avatarUrl = await uploadAvatar(data.user.id)
      if (avatarUrl) {
        await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', data.user.id)
      }
    }

    setLoading(false)
    navigate('/dashboard')
  }

  /* ── Step 1: choose role ── */
  if (step === 'role') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-2">Cria a tua conta</h1>
          <p className="text-gray-500 text-center mb-8">Como vais usar o CareConnect?</p>

          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => handleRoleSelect('client')}
              className="group flex items-center gap-5 p-6 bg-white border-2 border-gray-100
                         rounded-2xl hover:border-primary-400 hover:shadow-md active:scale-95
                         transition-all text-left"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                <User className="w-7 h-7 text-primary-600" />
              </div>
              <div>
                <div className="font-bold text-gray-900 text-lg">Sou Cliente</div>
                <div className="text-sm text-gray-500 mt-0.5">
                  Procuro cuidadores, enfermeiros ou assistentes para a minha família.
                </div>
              </div>
            </button>

            <button
              onClick={() => handleRoleSelect('professional')}
              className="group flex items-center gap-5 p-6 bg-white border-2 border-gray-100
                         rounded-2xl hover:border-primary-400 hover:shadow-md active:scale-95
                         transition-all text-left"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-7 h-7 text-amber-600" />
              </div>
              <div>
                <div className="font-bold text-gray-900 text-lg">Sou Profissional</div>
                <div className="text-sm text-gray-500 mt-0.5">
                  Ofereço serviços e quero receber clientes pela plataforma.
                </div>
              </div>
            </button>
          </div>

          <div className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">ou entra com</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <button
              onClick={async () => {
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: { redirectTo: `${window.location.origin}/auth/callback` },
                })
                if (error) alert('Google não disponível de momento.')
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200
                         rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300
                         active:scale-95 transition-all"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continuar com Google
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Já tens conta?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:underline">Entrar</Link>
          </p>
          <p className="text-center mt-1">
            <Link to="/" className="text-xs text-gray-400 hover:text-gray-600">← Voltar ao início</Link>
          </p>
        </div>
        </div>
      </div>
    )
  }

  /* ── Step 2: registration form ── */
  const isClient = userType === 'client'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="py-12 px-4">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => setStep('role')}
            className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center
                       justify-center hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              {isClient ? 'Registo de Cliente' : 'Registo de Profissional'}
            </h1>
            <p className="text-sm text-gray-500">
              {isClient
                ? 'Cria a tua conta e encontra o profissional certo.'
                : 'Apresenta-te e começa a receber clientes.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Avatar upload — professionals only */}
          {!isClient && (
            <div className="card flex flex-col items-center gap-3 py-8">
              <div
                className="w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow
                            flex items-center justify-center overflow-hidden cursor-pointer
                            hover:opacity-80 transition-opacity"
                onClick={() => avatarFileRef.current?.click()}
              >
                {avatarPreview
                  ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  : <Camera className="w-8 h-8 text-gray-400" />
                }
              </div>
              <button
                type="button"
                onClick={() => avatarFileRef.current?.click()}
                className="flex items-center gap-1.5 text-sm text-primary-600 font-medium hover:underline"
              >
                <Upload className="w-4 h-4" />
                {avatarPreview ? 'Alterar foto' : 'Adicionar foto de perfil'}
              </button>
              <input
                ref={avatarFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
          )}

          <div className="card space-y-5">
            {error === '__EMAIL_EXISTS__' ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-800">Este email já tem uma conta.</p>
                  <p className="text-amber-700 mt-0.5">
                    <Link to="/login" className="underline font-semibold hover:text-amber-900">
                      Clica aqui para Entrar
                    </Link>
                    {' '}ou usa outro email para te registar.
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            ) : null}

            {/* Name */}
            <div>
              <label className="input-label">Nome completo *</label>
              <input
                type="text"
                className="input-field"
                placeholder="Maria Silva"
                {...register('full_name', { required: 'Nome obrigatório' })}
              />
              {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="input-label">Email *</label>
              <input
                type="email"
                className="input-field"
                placeholder="maria@exemplo.pt"
                {...register('email', { required: 'Email obrigatório' })}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="input-label">Password *</label>
              <input
                type="password"
                className="input-field"
                placeholder="Mínimo 8 caracteres"
                {...register('password', {
                  required: 'Password obrigatória',
                  minLength: { value: 8, message: 'Mínimo 8 caracteres' },
                })}
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="input-label">Telefone *</label>
              <input
                type="tel"
                className="input-field"
                placeholder="+351 912 345 678"
                {...register('phone', { required: 'Telefone obrigatório' })}
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>

            {/* Country + City row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">País *</label>
                <select
                  className="input-field"
                  {...register('country', { required: 'País obrigatório' })}
                  onChange={handleCountryChange}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country.message}</p>}
              </div>

              <div>
                <label className="input-label">Cidade *</label>
                <select
                  className="input-field"
                  {...register('city', { required: 'Cidade obrigatória' })}
                  defaultValue=""
                >
                  <option value="" disabled>Seleciona...</option>
                  {(CITIES[country] || CITIES.PT).map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="input-label">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-500" />
                  Morada completa
                </span>
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Rua das Flores, 42, 3ºDto, 1100-200 Lisboa"
                {...register('address')}
              />
              <p className="text-xs text-gray-400 mt-1">Usada para calcular distâncias e agendar visitas.</p>
            </div>

            {/* Tax ID — Portugal (NIF/NIPC) or Brazil (CPF/CNPJ) */}
            {(country === 'PT' || country === 'BR') && (
              <div>
                <label className="input-label">{taxIdLabel()} (Número Fiscal)</label>
                <div className="flex gap-3 mb-2">
                  {['particular', 'empresa'].map((t) => (
                    <label
                      key={t}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 cursor-pointer text-sm font-medium transition-all
                                  ${taxIdType === t ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        checked={taxIdType === t}
                        onChange={() => { setTaxIdType(t); setTaxIdValue(''); setTaxIdError('') }}
                      />
                      <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center
                                       border-current flex-shrink-0">
                        {taxIdType === t && <span className="w-2 h-2 rounded-full bg-primary-500 block" />}
                      </span>
                      {t === 'particular'
                        ? `Particular (${country === 'PT' ? 'NIF' : 'CPF'})`
                        : `Empresa (${country === 'PT' ? 'NIPC' : 'CNPJ'})`}
                    </label>
                  ))}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  className={`input-field ${taxIdError ? 'border-red-300 focus:ring-red-200' : ''}`}
                  placeholder={
                    country === 'PT' ? '123456789' :
                    taxIdType === 'particular' ? '000.000.000-00' : '00.000.000/0001-00'
                  }
                  value={taxIdValue}
                  onChange={handleTaxIdChange}
                />
                {taxIdError && <p className="text-red-500 text-xs mt-1">{taxIdError}</p>}
              </div>
            )}

            {/* Professional-only fields */}
            {!isClient && (
              <>
                {/* Service type — dropdown with optgroups */}
                <div>
                  <label className="input-label">Profissão / Tipo de serviço *</label>
                  <select
                    className="input-field"
                    {...register('service_type', { required: 'Seleciona o tipo de serviço' })}
                    defaultValue=""
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
                  {errors.service_type && (
                    <p className="text-red-500 text-xs mt-1">{errors.service_type.message}</p>
                  )}
                </div>

                {/* "Outro" — custom profession name */}
                {isOtherType && (
                  <div>
                    <label className="input-label">Qual é a tua profissão? *</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Ex: Técnico de ar condicionado, Maquiador..."
                      {...register('custom_profession', { required: 'Indica a tua profissão' })}
                    />
                    {errors.custom_profession && (
                      <p className="text-red-500 text-xs mt-1">{errors.custom_profession.message}</p>
                    )}
                  </div>
                )}

                {/* License number — health professions only */}
                {needsLicense && (
                  <div>
                    <label className="input-label">
                      {getLicenseLabel(country, selectedServiceType)} *
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder={country === 'BR' ? 'Ex: COREN-SP 123456' : 'Ex: 7-E-123456'}
                      {...register('nursing_license', { required: 'Número de licença profissional obrigatório' })}
                    />
                    {errors.nursing_license && (
                      <p className="text-red-500 text-xs mt-1">{errors.nursing_license.message}</p>
                    )}
                  </div>
                )}

                {/* Hourly rate + daily rate */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">⏱ Preço por hora (€) *</label>
                    <input
                      type="number"
                      step="0.50"
                      min="5"
                      className="input-field"
                      placeholder="15.00"
                      {...register('hourly_rate', {
                        required: 'Preço por hora obrigatório',
                        min: { value: 1, message: 'Preço inválido' },
                      })}
                    />
                    {errors.hourly_rate && <p className="text-red-500 text-xs mt-1">{errors.hourly_rate.message}</p>}
                  </div>
                  <div>
                    <label className="input-label">📅 Valor por dia (€/$)</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      className="input-field"
                      placeholder="80"
                      {...register('daily_rate', {
                        min: { value: 1, message: 'Valor inválido' },
                      })}
                    />
                    {errors.daily_rate && <p className="text-red-500 text-xs mt-1">{errors.daily_rate.message}</p>}
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="input-label">Bio / Descrição</label>
                  <textarea
                    rows={4}
                    className="input-field resize-none"
                    placeholder="Apresenta-te: experiência, certificações, especialidades..."
                    {...register('bio')}
                  />
                </div>

                {/* Cleaner-specific fields */}
                {isCleanerType && (
                  <>
                    <div>
                      <label className="input-label">Tipos de limpeza oferecida *</label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {CLEANING_TYPES.map((type) => {
                          const checked = cleaningTypesSelected.includes(type.value)
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
                                  setCleaningTypesSelected((prev) =>
                                    e.target.checked ? [...prev, type.value] : prev.filter((v) => v !== type.value)
                                  )
                                }
                              />
                            </label>
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="input-label">Descrição dos serviços</label>
                      <textarea
                        rows={3}
                        className="input-field resize-none"
                        placeholder="Equipamentos utilizados, metodologia, o que inclui o serviço..."
                        {...register('cleaning_description')}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-base relative"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  A criar conta...
                </span>
              ) : isClient
                ? 'Criar conta e procurar serviços'
                : 'Criar conta e começar a trabalhar'}
            </button>

            {/* Google OAuth */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">ou</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <button
              type="button"
              onClick={async () => {
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: { redirectTo: `${window.location.origin}/auth/callback` },
                })
                if (error) alert('Google não disponível de momento.')
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200
                         rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300
                         active:scale-95 transition-all"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continuar com Google
            </button>

            <p className="text-center text-sm text-gray-500">
              Já tens conta?{' '}
              <Link to="/login" className="text-primary-600 font-semibold hover:underline">Entrar</Link>
            </p>
            <p className="text-center mt-1">
              <Link to="/" className="text-xs text-gray-400 hover:text-gray-600">← Voltar ao início</Link>
            </p>
          </div>
        </form>
      </div>
      </div>
    </div>
  )
}
