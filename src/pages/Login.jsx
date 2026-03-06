import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { LogIn, Loader2, AlertCircle, User, Briefcase } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

function LoginForm({ role, onSuccess }) {
  const { signIn } = useAuth()
  const [error, setError]             = useState(null)
  const [loading, setLoading]         = useState(false)
  const [socialLoading, setSocial]    = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async ({ email, password }) => {
    setLoading(true)
    setError(null)
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) {
      const m = err.message?.toLowerCase() || ''
      if (m.includes('invalid login'))        setError('Email ou password incorretos.')
      else if (m.includes('email not confirmed')) setError('Email não confirmado. Verifica a tua caixa de entrada.')
      else                                    setError('Erro ao entrar. Tenta novamente.')
    } else {
      onSuccess()
    }
  }

  const handleGoogle = async () => {
    setSocial(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (err) { setError('Google não disponível de momento.'); setSocial(false) }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={socialLoading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-200
                   rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300
                   active:scale-95 transition-all disabled:opacity-50"
      >
        <GoogleIcon />
        {socialLoading ? 'A redirecionar...' : 'Continuar com Google'}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">ou entra com email</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Email / Password */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

        <button type="submit" disabled={loading} className="btn-primary w-full text-base">
          {loading
            ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> A entrar...</span>
            : <><LogIn className="w-4 h-4" /> Entrar</>
          }
        </button>
      </form>

      {/* Register link */}
      <p className="text-center text-sm text-gray-500 pt-1 border-t border-gray-100">
        Não tens conta?{' '}
        <Link
          to={`/register?role=${role}`}
          className="text-primary-600 font-semibold hover:underline"
        >
          Cadastra-te aqui
        </Link>
      </p>
    </div>
  )
}

export default function Login() {
  const [searchParams]  = useSearchParams()
  const navigate        = useNavigate()
  const initialRole     = searchParams.get('role') === 'professional' ? 'professional' : 'client'
  const [tab, setTab]   = useState(initialRole)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-1">
            Bem-vindo(a) de volta
          </h1>
          <p className="text-gray-500 text-center mb-8 text-sm">
            Seleciona o teu perfil e entra na plataforma
          </p>

          {/* Role tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => setTab('client')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all
                          ${tab === 'client'
                            ? 'bg-white shadow-sm text-primary-600'
                            : 'text-gray-500 hover:text-gray-700'}`}
            >
              <User className="w-4 h-4" />
              Cliente
            </button>
            <button
              onClick={() => setTab('professional')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all
                          ${tab === 'professional'
                            ? 'bg-white shadow-sm text-amber-600'
                            : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Briefcase className="w-4 h-4" />
              Profissional
            </button>
          </div>

          {/* Form card */}
          <div className="card">
            <LoginForm key={tab} role={tab} onSuccess={() => navigate('/dashboard')} />
          </div>

          <p className="text-center mt-4">
            <Link to="/" className="text-xs text-gray-400 hover:text-gray-600">← Voltar ao início</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
