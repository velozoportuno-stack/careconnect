import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Heart, User, Briefcase, MapPin, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/appStore'
import { COUNTRIES, CITIES } from '../utils/locations'

const SERVICE_TYPES = [
  { value: 'caregiver', label: 'Cuidador(a) de Idosos', icon: '🧓' },
  { value: 'nurse',     label: 'Enfermeiro(a)',          icon: '🩺' },
  { value: 'cleaner',   label: 'Assistente de Limpeza',  icon: '🧹' },
]

export default function CompleteProfile() {
  const { user, setUserRole } = useAppStore()
  const navigate = useNavigate()

  const [userType, setUserType] = useState(null) // 'client' | 'professional'
  const [country, setCountry] = useState('PT')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm()
  const selectedServiceType = watch('service_type')

  function handleCountryChange(e) {
    setCountry(e.target.value)
    setValue('city', '')
  }

  const onSubmit = async (values) => {
    if (!user) { navigate('/login'); return }
    setLoading(true)
    setError(null)

    const role = userType === 'client' ? 'client' : values.service_type
    const updates = {
      role,
      phone:       values.phone,
      city:        values.city,
      country:     values.country,
      location:    values.address || null,
      updated_at:  new Date().toISOString(),
      ...(userType === 'professional' && {
        hourly_rate: parseFloat(values.hourly_rate) || null,
        bio:         values.bio || null,
      }),
    }

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({ id: user.id, email: user.email, full_name: user.user_metadata?.full_name, ...updates }, { onConflict: 'id' })

    if (upsertError) {
      setError('Erro ao guardar o perfil. Tenta novamente.')
      setLoading(false)
      return
    }

    setUserRole(role)
    setLoading(false)
    navigate('/dashboard')
  }

  // Step 1: choose account type
  if (!userType) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
        <div className="flex items-center gap-2 mb-10">
          <Heart className="w-6 h-6 text-primary-600" fill="currentColor" />
          <span className="text-xl font-bold text-gray-900">
            Care<span className="text-primary-600">Connect</span>
          </span>
        </div>

        <div className="w-full max-w-md">
          <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-1">Quase lá!</h1>
          <p className="text-gray-500 text-center mb-8">
            Só precisamos de mais alguns dados para completar o teu perfil.
          </p>

          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => setUserType('client')}
              className="flex items-center gap-5 p-6 bg-white border-2 border-gray-100
                         rounded-2xl hover:border-primary-400 hover:shadow-md active:scale-95
                         transition-all text-left"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                <User className="w-7 h-7 text-primary-600" />
              </div>
              <div>
                <div className="font-bold text-gray-900 text-lg">Sou Cliente</div>
                <div className="text-sm text-gray-500 mt-0.5">Procuro serviços de cuidado para a minha família.</div>
              </div>
            </button>

            <button
              onClick={() => setUserType('professional')}
              className="flex items-center gap-5 p-6 bg-white border-2 border-gray-100
                         rounded-2xl hover:border-primary-400 hover:shadow-md active:scale-95
                         transition-all text-left"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-7 h-7 text-amber-600" />
              </div>
              <div>
                <div className="font-bold text-gray-900 text-lg">Sou Profissional</div>
                <div className="text-sm text-gray-500 mt-0.5">Ofereço serviços de cuidado e quero receber clientes.</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isClient = userType === 'client'

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="w-6 h-6 text-primary-600" fill="currentColor" />
            <span className="text-xl font-bold text-gray-900">
              Care<span className="text-primary-600">Connect</span>
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Completa o teu perfil</h1>
          <p className="text-gray-500 mt-1">
            {isClient ? 'Dados de cliente' : 'Dados de profissional'}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="input-label">Telefone *</label>
            <input type="tel" className="input-field" placeholder="+351 912 345 678"
              {...register('phone', { required: 'Telefone obrigatório' })} />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">País *</label>
              <select className="input-field" defaultValue="PT"
                {...register('country', { required: true })}
                onChange={handleCountryChange}>
                {COUNTRIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Cidade *</label>
              <select className="input-field" defaultValue=""
                {...register('city', { required: 'Cidade obrigatória' })}>
                <option value="" disabled>Seleciona...</option>
                {(CITIES[country] || CITIES.PT).map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
            </div>
          </div>

          <div>
            <label className="input-label">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-500" /> Morada completa
              </span>
            </label>
            <input type="text" className="input-field"
              placeholder="Rua das Flores, 42, 1100-200 Lisboa"
              {...register('address')} />
          </div>

          {!isClient && (
            <>
              <div>
                <label className="input-label">Tipo de serviço *</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {SERVICE_TYPES.map((t) => (
                    <label key={t.value}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all
                                  ${selectedServiceType === t.value
                                    ? 'border-primary-500 bg-primary-50'
                                    : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    >
                      <input type="radio" value={t.value} className="sr-only"
                        {...register('service_type', { required: 'Seleciona o tipo' })} />
                      <span className="text-2xl">{t.icon}</span>
                      <span className="text-xs font-medium text-gray-700 text-center leading-tight">{t.label}</span>
                    </label>
                  ))}
                </div>
                {errors.service_type && <p className="text-red-500 text-xs mt-1">{errors.service_type.message}</p>}
              </div>

              <div>
                <label className="input-label">Preço por hora (€) *</label>
                <input type="number" step="0.50" min="5" className="input-field" placeholder="15.00"
                  {...register('hourly_rate', { required: 'Preço obrigatório', min: 1 })} />
                {errors.hourly_rate && <p className="text-red-500 text-xs mt-1">{errors.hourly_rate.message}</p>}
              </div>

              <div>
                <label className="input-label">Bio / Descrição</label>
                <textarea rows={3} className="input-field resize-none"
                  placeholder="Experiência, certificações, especialidades..."
                  {...register('bio')} />
              </div>
            </>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full text-base">
            {loading
              ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> A guardar...</span>
              : 'Guardar e entrar'}
          </button>

          <button type="button" onClick={() => setUserType(null)}
            className="w-full text-sm text-gray-400 hover:text-gray-600 text-center py-1">
            ← Voltar à escolha do tipo de conta
          </button>
        </form>
      </div>
    </div>
  )
}
