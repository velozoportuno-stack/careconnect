import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/appStore'
import { SERVICE_TYPE_LABELS, LICENSE_REQUIRED } from '../utils/constants'

export const useAuth = () => {
  const { user, setUser, setUserRole, clearUser } = useAppStore()

  useEffect(() => {
    // Verificar sessão ativa
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchUserRole(session.user.id)
      }
    })

    // Listener de mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          fetchUserRole(session.user.id)
        } else {
          clearUser()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserRole = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    if (data?.role) setUserRole(data.role)
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

    if (error || !data.user) return { data, error }

    // Separate extended fields (new columns) from core fields so a missing
    // column doesn't prevent role from being saved correctly.
    const {
      service_type, nursing_license, nursing_license_country,
      cleaning_types, cleaning_description, daily_rate,
      custom_profession, tax_id, tax_id_type,
      ...coreData
    } = userData

    // Generate a unique 6-digit ID for professionals
    const professionalIdNumber =
      userData.role === 'professional'
        ? Math.floor(100000 + Math.random() * 900000)
        : undefined

    // 1. Save core profile fields — role MUST be saved here.
    // The handle_new_user trigger may have already inserted a row with
    // role='client'; this upsert overwrites it with the correct role.
    const { error: coreErr } = await supabase
      .from('profiles')
      .upsert(
        {
          id: data.user.id,
          email,
          ...coreData,
          ...(professionalIdNumber && { professional_id_number: professionalIdNumber }),
        },
        { onConflict: 'id' }
      )

    if (coreErr) {
      // Core save failed — surface the error so registration shows it.
      return { data, error: coreErr }
    }

    // 2. Save extended professional fields in a separate call so that
    // if a column is missing (migration not run) it fails gracefully
    // without rolling back the role already saved above.
    const extended = {
      ...(service_type                != null && { service_type }),
      ...(cleaning_types?.length               && { cleaning_types }),
      ...(cleaning_description        != null && { cleaning_description }),
      ...(daily_rate                  != null && { daily_rate }),
      ...(custom_profession           != null && { custom_profession }),
      ...(tax_id                      != null && { tax_id }),
      ...(tax_id_type                 != null && { tax_id_type }),
    }
    if (Object.keys(extended).length > 0) {
      await supabase.from('profiles').update(extended).eq('id', data.user.id)
      // Intentionally ignore errors here — role is already correctly saved.
    }

    // 3. For professionals, create their first provider_services row so the
    //    "Os meus serviços" tab shows something immediately after registration.
    if (userData.role === 'professional' && service_type) {
      const title = SERVICE_TYPE_LABELS[service_type] || custom_profession || 'Serviço'
      const needsLicense = LICENSE_REQUIRED.has(service_type)
      await supabase.from('provider_services').insert({
        provider_id:    data.user.id,
        category:       service_type,
        title,
        bio:            coreData.bio        || null,
        price_per_hour: coreData.hourly_rate != null ? parseFloat(coreData.hourly_rate) : null,
        daily_rate:     daily_rate           != null ? parseFloat(daily_rate)           : null,
        is_available:   true,
        ...(needsLicense && nursing_license && {
          nursing_license,
          nursing_license_country: nursing_license_country || 'PT',
        }),
      })
      // Ignore insert errors — profile is already saved correctly.
    }

    return { data, error: null }
  }

  const signOut = () => supabase.auth.signOut()

  return { user, signIn, signUp, signOut }
}
