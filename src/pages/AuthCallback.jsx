import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { supabase } from '../lib/supabase'

/**
 * Landing page after a successful OAuth redirect.
 * Waits for the session + profile role to be available, then routes:
 *   – new user (no role) → /complete-profile
 *   – returning user    → /dashboard
 */
export default function AuthCallback() {
  const { user, userRole } = useAppStore()
  const navigate = useNavigate()
  const checked = useRef(false)

  useEffect(() => {
    if (checked.current) return

    const check = async () => {
      checked.current = true

      // If no session yet, wait for onAuthStateChange (handled in useAuth)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        navigate('/login')
        return
      }

      // Fetch the profile directly (don't rely on store timing)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (!profile?.role) {
        navigate('/complete-profile')
      } else {
        navigate('/dashboard')
      }
    }

    check()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-2">
        <Heart className="w-6 h-6 text-primary-600" fill="currentColor" />
        <span className="text-xl font-bold text-gray-900">
          Care<span className="text-primary-600">Connect</span>
        </span>
      </div>
      <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">A verificar a tua conta...</p>
    </div>
  )
}
