import { useState, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Heart, User, Briefcase, ArrowLeft, Camera, Upload, MapPin, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

// Traduz mensagens de erro do Supabase para português
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

const SERVICE_TYPES = [
  { value: 'caregiver', label: 'Cuidador(a) de Idosos', icon: '🧓' },
  { value: 'nurse',     label: 'Enfermeiro(a)',          icon: '🩺' },
  { value: 'cleaner',   label: 'Assistente de Limpeza',  icon: '🧹' },
]

const CITIES = {
  PT: [
    'Viana do Castelo', 'Braga', 'Porto', 'Aveiro', 'Coimbra',
    'Lisboa', 'Setúbal', 'Faro', 'Évora', 'Viseu',
  ],
  BR: [
    'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Salvador', 'Fortaleza',
    'Curitiba', 'Manaus', 'Recife', 'Porto Alegre', 'Belém',
  ],
}

const COUNTRIES = [
  { value: 'PT', label: '🇵🇹 Portugal' },
  { value: 'BR', label: '🇧🇷 Brasil' },
]

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const initialRole = searchParams.get('role')
  const [step, setStep] = useState(initialRole ? 'form' : 'role')
  const [userType, setUserType] = useState(
    initialRole === 'professional' ? 'professional' : initialRole === 'client' ? 'client' : null
  )
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [country, setCountry] = useState('PT')
  const avatarFileRef = useRef(null)

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm()
  const selectedServiceType = watch('service_type')

  function handleRoleSelect(type) {
    setUserType(type)
    setStep('form')
  }

  function handleCountryChange(e) {
    setCountry(e.target.value)
    setValue('city', '') // reset city when country changes
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

    const role = userType === 'client' ? 'client' : values.service_type
    const userData = {
      full_name:   values.full_name,
      phone:       values.phone,
      city:        values.city,
      country:     values.country,
      location:    values.address || null,
      role,
      ...(userType === 'professional' && {
        hourly_rate: parseFloat(values.hourly_rate) || null,
        bio:         values.bio || null,
      }),
    }

    const { data, error: signUpError } = await signUp(values.email, values.password, userData)

    if (signUpError) {
      const translated = translateError(signUpError.message)
      setError(translated)
      setLoading(false)
      return
    }

    if (userType === 'professional' && data?.user && avatarFileRef.current?.files?.[0]) {
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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
        <Link to="/" className="flex items-center gap-2 mb-10">
          <Heart className="w-6 h-6 text-primary-600" fill="currentColor" />
          <span className="text-xl font-bold text-gray-900">
            Care<span className="text-primary-600">Connect</span>
          </span>
        </Link>

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
                  Ofereço serviços de cuidado e quero receber clientes pela plataforma.
                </div>
              </div>
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Já tens conta?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    )
  }

  /* ── Step 2: registration form ── */
  const isClient = userType === 'client'

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
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
                  defaultValue="PT"
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

            {/* Professional-only fields */}
            {!isClient && (
              <>
                <div>
                  <label className="input-label">Tipo de serviço *</label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {SERVICE_TYPES.map((t) => (
                      <label
                        key={t.value}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all
                                    ${selectedServiceType === t.value
                                      ? 'border-primary-500 bg-primary-50'
                                      : 'border-gray-200 bg-white hover:border-gray-300'}`}
                      >
                        <input
                          type="radio"
                          value={t.value}
                          className="sr-only"
                          {...register('service_type', { required: 'Seleciona o tipo de serviço' })}
                        />
                        <span className="text-2xl">{t.icon}</span>
                        <span className="text-xs font-medium text-gray-700 text-center leading-tight">{t.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.service_type && (
                    <p className="text-red-500 text-xs mt-1">{errors.service_type.message}</p>
                  )}
                </div>

                <div>
                  <label className="input-label">Preço por hora (€) *</label>
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
                  <label className="input-label">Bio / Descrição</label>
                  <textarea
                    rows={4}
                    className="input-field resize-none"
                    placeholder="Apresenta-te: experiência, certificações, especialidades..."
                    {...register('bio')}
                  />
                </div>
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

            <p className="text-center text-sm text-gray-500">
              Já tens conta?{' '}
              <Link to="/login" className="text-primary-600 font-semibold hover:underline">Entrar</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
