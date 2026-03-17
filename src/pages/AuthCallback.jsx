import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { supabase } from '../lib/supabase'

/**
 * Landing page after a successful OAuth redirect.
 *
 * Why user.created_at?
 *   Supabase's handle_new_user trigger fires immediately when the auth row is
 *   created and inserts a profiles row with role='client' by default.  By the
 *   time AuthCallback runs the profile already exists — so we can't use
 *   "profile exists" to decide whether this is a new signup.
 *   Instead we compare the auth-user's created_at to now: if < 2 minutes the
 *   user just signed up; if older they are returning.
 *
 * Flow:
 *   New user  (created_at < 2 min) + pendingRole in localStorage
 *             → upsert profile with correct role → /edit-profile
 *   Returning user (created_at >= 2 min)
 *             → /dashboard  (never touch their stored role)
 *   Edge case (new user, no pendingRole e.g. role-step Google button)
 *             → upsert with 'client' → /edit-profile
 */
export default function AuthCallback() {
  const navigate = useNavigate()
  const checked  = useRef(false)

  useEffect(() => {
    if (checked.current) return

    const check = async () => {
      checked.current = true

      // ── 1. Read pendingRole SYNCHRONOUSLY before any awaits ──────────────
      // Must happen before the first await to avoid any race where something
      // else might clear localStorage.
      const pendingRole = localStorage.getItem('pendingRole')
      localStorage.removeItem('pendingRole')

      console.log('[AuthCallback] pendingRole from localStorage:', pendingRole)

      // ── 2. Get session ────────────────────────────────────────────────────
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        navigate('/login')
        return
      }

      const user = session.user

      // ── 3. Decide: new signup or returning user? ──────────────────────────
      // The Supabase trigger creates the profile row immediately on signup, so
      // "profile exists" is useless as a new-user signal.  Use the auth-user
      // creation time instead: anything < 2 minutes is a fresh registration.
      const authUserAgeMs = Date.now() - new Date(user.created_at).getTime()
      const isNewSignup   = authUserAgeMs < 120_000   // 2 minutes

      console.log('[AuthCallback] auth user age (ms):', authUserAgeMs, '→ isNewSignup:', isNewSignup)

      if (isNewSignup) {
        // ── New OAuth user ─────────────────────────────────────────────────
        const role = pendingRole || 'client'
        console.log('[AuthCallback] user role being saved:', role)

        const { error: upsertErr } = await supabase
          .from('profiles')
          .upsert(
            {
              id:         user.id,
              full_name:  user.user_metadata?.full_name  || '',
              avatar_url: user.user_metadata?.avatar_url || null,
              role,
            },
            { onConflict: 'id' }
          )

        if (upsertErr) {
          console.error('[AuthCallback] profile upsert error:', upsertErr.message)
        }

        // Send to edit-profile to complete missing details
        navigate('/edit-profile')
        return
      }

      // ── Returning user ────────────────────────────────────────────────────
      // Check profile exists (it should) — go to dashboard.
      const { data: existing } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .single()

      if (existing?.role) {
        navigate('/dashboard')
      } else {
        // Unusual: returning auth user with no profile row — create it.
        await supabase.from('profiles').upsert(
          {
            id:         user.id,
            full_name:  user.user_metadata?.full_name  || '',
            avatar_url: user.user_metadata?.avatar_url || null,
            role:       pendingRole || 'client',
          },
          { onConflict: 'id' }
        )
        navigate('/edit-profile')
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


