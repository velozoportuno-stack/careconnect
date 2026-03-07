import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/appStore'

export const useAuth = () => {
  const { user, setUser, setUserRole, setSecondaryRole, clearUser } = useAppStore()

  useEffect(() => {
    // Verificar sessão ativa
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchUserProfile(session.user.id)
      }
    })

    // Listener de mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          fetchUserProfile(session.user.id)
        } else {
          clearUser()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('role, secondary_role')
      .eq('id', userId)
      .single()
    if (data?.role) {
      if (data.secondary_role) setSecondaryRole(data.secondary_role)
      setUserRole(data.role)
    }
  }

  const signIn = async (email, password) => {
    return supabase.auth.signInWithPassword({ email, password })
  }

  const signUp = async (email, password, userData) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: userData.full_name } },
    })
    if (data.user && !error) {
      // The handle_new_user trigger already inserts the profile row on
      // auth.users INSERT. Use upsert so extra fields (role, city, …)
      // are set without a duplicate-key error if the trigger ran first.
      await supabase.from('profiles').upsert(
        { id: data.user.id, email, ...userData },
        { onConflict: 'id' }
      )
    }
    return { data, error }
  }

  const signOut = () => supabase.auth.signOut()

  return { user, signIn, signUp, signOut }
}
