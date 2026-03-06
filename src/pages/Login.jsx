import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { LogIn, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

function SocialButton({ icon, label, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-200
                 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300
                 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {icon}
      {label}
    </button>
  )
}

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState(null)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async ({ email, password }) => {
    setLoading(true)
    setError(null)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      if (error.message?.toLowerCase().includes('invalid login')) {
        setError('Email ou password incorretos.')
      } else if (error.message?.toLowerCase().includes('email not confirmed')) {
        setError('Email não confirmado. Verifica a tua caixa de entrada.')
      } else {
        setError('Erro ao entrar. Tenta novamente.')
      }
    } else {
      navigate('/dashboard')
    }
  }

  const handleOAuth = async (provider) => {
    setSocialLoading(provider)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(`Login com ${provider === 'google' ? 'Google' : 'Apple'} não disponível de momento.`)
      setSocialLoading(null)
    }
    // On success the browser redirects — no further action needed here
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-1">
            Bem-vindo(a) de volta
          </h1>
          <p className="text-gray-500 text-center mb-8">
            Ainda não tens conta?{' '}
            <Link to="/register" className="text-primary-600 font-semibold hover:underline">
              Cadastra-te
            </Link>
          </p>

          {/* Social login */}
          <div className="space-y-3 mb-6">
            <SocialButton
              icon={
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              }
              label={socialLoading === 'google' ? 'A redirecionar...' : 'Continuar com Google'}
              onClick={() => handleOAuth('google')}
              disabled={!!socialLoading}
            />
            <SocialButton
              icon={
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
              }
              label={socialLoading === 'apple' ? 'A redirecionar...' : 'Continuar com Apple'}
              onClick={() => handleOAuth('apple')}
              disabled={!!socialLoading}
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">ou</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Email/password form */}
          <div className="card">
            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="input-label">Email</label>
                <input type="email" className="input-field" placeholder="maria@exemplo.pt"
                  autoComplete="email"
                  {...register('email', { required: 'Email obrigatório' })} />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="input-label">Password</label>
                <input type="password" className="input-field" placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password', { required: 'Password obrigatória' })} />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full text-base">
                {loading
                  ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> A entrar...</span>
                  : <><LogIn className="w-4 h-4" /> Entrar</>
                }
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Não tens conta?{' '}
            <Link to="/register" className="text-primary-600 font-semibold hover:underline">Cadastra-te gratuitamente</Link>
          </p>
          <p className="text-center mt-2">
            <Link to="/" className="text-xs text-gray-400 hover:text-gray-600">← Voltar ao início</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
