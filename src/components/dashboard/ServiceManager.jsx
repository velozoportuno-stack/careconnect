import { useState, useEffect } from 'react'
import { Briefcase } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/appStore'
import { SERVICE_TYPE_LABELS } from '../../utils/constants'

export default function ServiceManager() {
  const { user } = useAppStore()
  const [slot1Type, setSlot1Type] = useState(null)   // from profiles
  const [slot2Type, setSlot2Type] = useState(null)   // from provider_services slot=2
  const [loading, setLoading]    = useState(true)

  useEffect(() => {
    async function fetchSlots() {
      const [{ data: prof }, { data: svc2, error: e2 }] = await Promise.all([
        // Perfil 1 — always from profiles table
        supabase.from('profiles').select('service_type').eq('id', user.id).single(),
        // Perfil 2 — provider_services slot 2
        supabase
          .from('provider_services')
          .select('service_type')
          .eq('professional_id', user.id)
          .eq('slot', 2)
          .maybeSingle(),
      ])

      if (e2) console.error('[ServiceManager] slot 2 fetch error:', e2)

      setSlot1Type(prof?.service_type || null)
      setSlot2Type(svc2?.service_type || null)
      setLoading(false)
    }
    fetchSlots()
  }, [])

  if (loading) return <div className="card animate-pulse h-16 mb-6" />

  const label = (type) =>
    type ? (SERVICE_TYPE_LABELS[type] || type) : null

  return (
    <div className="card mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Briefcase className="w-5 h-5 text-primary-600" />
        <h2 className="text-lg font-bold text-gray-900">Os meus serviços</h2>
      </div>
      <div className="space-y-1">
        {[
          { num: 1, value: label(slot1Type) },
          { num: 2, value: label(slot2Type) },
        ].map(({ num, value }) => (
          <p key={num} className="text-sm text-gray-700">
            <span className="font-semibold text-gray-900">Perfil {num}</span>
            {' — '}
            <span className={value ? 'text-gray-700' : 'text-gray-400 italic'}>
              {value ?? 'Não configurado'}
            </span>
          </p>
        ))}
      </div>
    </div>
  )
}
