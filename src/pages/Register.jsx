import { useState, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Heart, User, Briefcase, ArrowLeft, Camera, Upload } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const SERVICE_TYPES = [
  { value: 'caregiver', label: 'Cuidador(a) de Idosos', icon: '🧓' },
  { value: 'nurse',     label: 'Enfermeiro(a)',          icon: '🩺' },
  { value: 'cleaner',   label: 'Assistente de Limpeza',  icon: '🧹' },
]

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Step: 'role' | 'form'
  const initialRole = searchParams.get('role') // 'client' or 'professional'
  const [step, setStep] = useState(initialRole ? 'form' : 'role')
  const [userType, setUserType] = useState(
    initialRole === 'professional' ? 'professional' : initialRole === 'client' ? 'client' : null
  )
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const avatarFileRef = useRef(null)

  const { register, handleSubmit, formState: { errors }, watch } = useForm()
  const selectedServiceType = watch('service_type')

  function handleRoleSelect(type) {
    setUserType(type)
    setStep('form')
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setAvatarPreview(url)
    }
  }

  async function uploadAvatar(userId) {
    const file = avatarFileRef.current?.files?.[0]
    if (!file) return null
    const ext = file.name.split('.').pop()
    const path = `${userId}.${ext}`
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
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
      role,
      ...(userType === 'professional' && {
        hourly_rate: parseFloat(values.hourly_rate) || null,
        bio:         values.bio || null,
      }),
    }

    const { data, error: signUpError } = await signUp(values.email, values.password, userData)

    if (signUpError) {
      setError(signUpError.message || 'Erro ao criar conta. Tente novamente.')
      setLoading(false)
      return
    }

    // Upload avatar if professional selected one
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
          <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-2">
            Cria a tua conta
          </h1>
          <p className="text-gray-500 text-center mb-8">Como vais usar o CareConnect?</p>

          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => handleRoleSelect('client')}
              className="group flex items-center gap-5 p-6 bg-white border-2 border-gray-100
                         rounded-2xl hover:border-primary-400 hover:shadow-md
                         active:scale-95 transition-all text-left"
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
                         rounded-2xl hover:border-primary-400 hover:shadow-md
                         active:scale-95 transition-all text-left"
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
            <Link to="/login" className="text-primary-600 font-semibold hover:underline">
              Entrar
            </Link>
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
            className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center
                       hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              {isClient ? 'Registo de Cliente' : 'Registo de Profissional'}
            </h1>
            <p className="text-sm text-gray-500">
              {isClient ? 'Cria a tua conta e encontra o profissional certo.' : 'Apresenta-te e começa a receber clientes.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Avatar upload (professionals only) */}
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
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Common fields */}
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

            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <label className="input-label">Cidade *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Lisboa"
                  {...register('city', { required: 'Cidade obrigatória' })}
                />
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
              </div>
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
                    {...register('hourly_rate', { required: 'Preço por hora obrigatório', min: { value: 1, message: 'Preço inválido' } })}
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
              className="btn-primary w-full text-base"
            >
              {loading ? 'A criar conta...' : isClient ? 'Criar conta e procurar serviços' : 'Criar conta e começar a trabalhar'}
            </button>

            <p className="text-center text-sm text-gray-500">
              Já tens conta?{' '}
              <Link to="/login" className="text-primary-600 font-semibold hover:underline">
                Entrar
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
