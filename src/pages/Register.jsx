import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../hooks/useAuth'

const ROLES = [
  { value: 'client', label: 'Cliente (preciso de cuidados)' },
  { value: 'caregiver', label: 'Cuidador de Idosos' },
  { value: 'nurse', label: 'Enfermeiro(a)' },
  { value: 'cleaner', label: 'Assistente de Limpeza' },
]

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async ({ email, password, full_name, role, city }) => {
    setLoading(true)
    setError(null)
    const { error } = await signUp(email, password, { full_name, role, city })
    setLoading(false)
    if (error) {
      setError(error.message || 'Erro ao criar conta. Tente novamente.')
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link to="/" className="text-2xl font-bold text-primary-600">CareConnect</Link>
          <h2 className="mt-4 text-3xl font-bold text-gray-900">Criar conta</h2>
          <p className="mt-2 text-gray-500">
            Já tem conta?{' '}
            <Link to="/login" className="text-primary-600 hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </div>

        <div className="card">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
              <input
                type="text"
                className="input-field"
                placeholder="João Silva"
                {...register('full_name', { required: 'Nome obrigatório' })}
              />
              {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="seu@email.com"
                {...register('email', { required: 'Email obrigatório' })}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                {...register('password', { required: 'Senha obrigatória', minLength: { value: 8, message: 'Mínimo 8 caracteres' } })}
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de conta</label>
              <select
                className="input-field"
                {...register('role', { required: 'Selecione o tipo de conta' })}
              >
                <option value="">Selecione...</option>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
              <input
                type="text"
                className="input-field"
                placeholder="Lisboa"
                {...register('city', { required: 'Cidade obrigatória' })}
              />
              {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-60">
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
