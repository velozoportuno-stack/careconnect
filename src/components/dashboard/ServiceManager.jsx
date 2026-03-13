import { useState, useEffect } from 'react'
import { Briefcase } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/appStore'
import { SERVICE_TYPE_LABELS } from '../../utils/constants'

export default function ServiceManager() {
  const { user } = useAppStore()
  const [slots, setSlots]   = useState([null, null])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSlots() {
      const [{ data: s1 }, { data: s2 }] = await Promise.all([
        supabase.from('provider_services').select('category, title').eq('provider_id', user.id).eq('slot', 1).maybeSingle(),
        supabase.from('provider_services').select('category, title').eq('provider_id', user.id).eq('slot', 2).maybeSingle(),
      ])
      setSlots([s1 || null, s2 || null])
      setLoading(false)
    }
    fetchSlots()
  }, [])

  if (loading) return <div className="card animate-pulse h-16 mb-6" />

  return (
    <div className="card mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Briefcase className="w-5 h-5 text-primary-600" />
        <h2 className="text-lg font-bold text-gray-900">Os meus serviços</h2>
      </div>
      <div className="space-y-1">
        {[1, 2].map((slotNum) => {
          const svc = slots[slotNum - 1]
          const label = svc
            ? (SERVICE_TYPE_LABELS[svc.category] || svc.title || 'Serviço')
            : 'Não configurado'
          return (
            <p key={slotNum} className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Perfil {slotNum}</span>
              {' — '}
              <span className={svc ? 'text-gray-700' : 'text-gray-400 italic'}>{label}</span>
            </p>
          )
        })}
      </div>
    </div>
  )
}
