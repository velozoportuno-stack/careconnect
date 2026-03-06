import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Heart, LogIn } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async ({ email, password }) => {
    setLoading(true)
    setError(null)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError('Email ou password incorretos. Tenta novamente.')
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">

      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 mb-8">
        <Heart className="w-6 h-6 text-primary-600" fill="currentColor" />
        <span className="text-xl font-bold text-gray-900">
          Care<span className="text-primary-600">Connect</span>
        </span>
      </Link>

      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-1">Bem-vindo(a) de volta</h1>
        <p className="text-gray-500 text-center mb-8">
          Ainda não tens conta?{' '}
          <Link to="/register" className="text-primary-600 font-semibold hover:underline">
            Registar
          </Link>
        </p>

        <div className="card">
          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="input-label">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="maria@exemplo.pt"
                autoComplete="email"
                {...register('email', { required: 'Email obrigatório' })}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="input-label">Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('password', { required: 'Password obrigatória' })}
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-base"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'A entrar...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Ao entrares, aceitas os nossos{' '}
          <span className="underline cursor-pointer">Termos de Serviço</span>
          {' '}e{' '}
          <span className="underline cursor-pointer">Política de Privacidade</span>.
        </p>
      </div>
    </div>
  )
}
