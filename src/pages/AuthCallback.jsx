import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { supabase } from '../lib/supabase'

/**
 * Landing page after a successful OAuth redirect.
 * – New user: reads pendingRole from localStorage, creates profile, → /edit-profile
 * – Returning user (profile exists): → /dashboard
 */
export default function AuthCallback() {
  const navigate = useNavigate()
  const checked  = useRef(false)

  useEffect(() => {
    if (checked.current) return

    const check = async () => {
      checked.current = true

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        navigate('/login')
        return
      }

      const user = session.user

      // Check if a profile already exists for this user
      const { data: existing } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .single()

      if (existing?.role) {
        // Returning user — go straight to dashboard
        navigate('/dashboard')
        return
      }

      // New user — consume the intended role stored before OAuth redirect
      const pendingRole = localStorage.getItem('pendingRole') || 'client'
      localStorage.removeItem('pendingRole')

      // Create the profile; ignore duplicate-key errors (trigger may have fired first)
      const { error: insertErr } = await supabase.from('profiles').insert({
        id:         user.id,
        full_name:  user.user_metadata?.full_name  || '',
        avatar_url: user.user_metadata?.avatar_url || null,
        role:       pendingRole,
      })
      if (insertErr && insertErr.code !== '23505') {
        console.error('[AuthCallback] profile insert error:', insertErr.message)
      }

      // Send to edit-profile so they can complete their details
      // (works for both professional and client — the page adapts to role)
      navigate('/edit-profile')
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

