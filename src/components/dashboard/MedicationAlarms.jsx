import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, BellOff, CheckCircle, XCircle, Clock, Volume2, VolumeX } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/appStore'

const STATUS_CONFIG = {
  pending: { label: 'Pendente',       icon: Clock,         css: 'text-amber-600 bg-amber-50 border-amber-200' },
  given:   { label: 'Administrado',   icon: CheckCircle,   css: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  missed:  { label: 'Não administrado', icon: XCircle,     css: 'text-red-600 bg-red-50 border-red-200' },
}

// Generates a beep via Web Audio API
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.5, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.8)
  } catch (_) { /* silently ignore if audio context unavailable */ }
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function nowHHMM() {
  const n = new Date()
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
}

export default function MedicationAlarms({ bookingId, isProvider }) {
  const { user } = useAppStore()
  const [meds, setMeds]       = useState([])
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [soundOn, setSoundOn] = useState(true)
  const alarmFiredRef         = useRef(new Set()) // track already-beeped alarms

  const fetchData = useCallback(async () => {
    const [{ data: medsData }, { data: logsData }] = await Promise.all([
      supabase
        .from('medications')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('is_active', true),
      supabase
        .from('medication_logs')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('scheduled_date', todayStr()),
    ])
    setMeds(medsData || [])
    setLogs(logsData || [])
    setLoading(false)
  }, [bookingId])

  // Ensure today's logs exist for each medication schedule time
  const ensureTodayLogs = useCallback(async (allMeds) => {
    for (const med of allMeds) {
      for (const t of (med.schedule_times || [])) {
        const exists = logs.some(
          (l) => l.medication_id === med.id && l.scheduled_time === t && l.scheduled_date === todayStr()
        )
        if (!exists) {
          await supabase.from('medication_logs').upsert({
            medication_id:  med.id,
            booking_id:     bookingId,
            scheduled_time: t,
            scheduled_date: todayStr(),
            status:         'pending',
          }, { onConflict: 'medication_id,scheduled_time,scheduled_date' })
        }
      }
    }
  }, [bookingId, logs])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Set up realtime subscription on medication_logs
  useEffect(() => {
    const channel = supabase
      .channel(`med-logs-${bookingId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'medication_logs',
        filter: `booking_id=eq.${bookingId}`,
      }, () => {
        fetchData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [bookingId, fetchData])

  // Check for due alarms every 30 seconds
  useEffect(() => {
    const check = () => {
      if (!isProvider) return
      const hhmm = nowHHMM()
      logs.forEach((log) => {
        if (log.status === 'pending' && log.scheduled_time === hhmm) {
          const key = `${log.id}-${hhmm}`
          if (!alarmFiredRef.current.has(key)) {
            alarmFiredRef.current.add(key)
            if (soundOn) playBeep()
          }
        }
      })
    }
    check()
    const id = setInterval(check, 30000)
    return () => clearInterval(id)
  }, [logs, soundOn, isProvider])

  useEffect(() => {
    if (meds.length > 0) ensureTodayLogs(meds)
  }, [meds]) // eslint-disable-line react-hooks/exhaustive-deps

  async function updateLog(logId, status) {
    await supabase
      .from('medication_logs')
      .update({ status, confirmed_at: new Date().toISOString(), confirmed_by: user?.id })
      .eq('id', logId)
    fetchData()
  }

  if (loading) return (
    <div className="text-xs text-gray-400 text-center py-3">A carregar medicamentos...</div>
  )

  if (!meds.length) return null

  const hhmm = nowHHMM()

  // Build a view: each scheduled time per medication + its log status
  const schedule = meds.flatMap((med) =>
    (med.schedule_times || []).map((t) => {
      const log = logs.find((l) => l.medication_id === med.id && l.scheduled_time === t)
      const isDue = t <= hhmm && log?.status === 'pending'
      return { med, time: t, log, isDue }
    })
  ).sort((a, b) => a.time.localeCompare(b.time))

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white mt-3">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary-500" />
          <span className="text-sm font-bold text-gray-800">Alarmes de Medicação — Hoje</span>
        </div>
        {isProvider && (
          <button
            onClick={() => setSoundOn((s) => !s)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title={soundOn ? 'Desativar som' : 'Ativar som'}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        )}
      </div>

      <div className="divide-y divide-gray-50">
        {schedule.map(({ med, time, log, isDue }, i) => {
          const statusKey = log?.status || 'pending'
          const { label, icon: Icon, css } = STATUS_CONFIG[statusKey]

          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 ${isDue ? 'bg-amber-50' : ''}`}
            >
              {isDue && (
                <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                </span>
              )}
              <span className="text-sm font-bold text-gray-700 w-12 flex-shrink-0">{time}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{med.name}</p>
                {med.dosage && <p className="text-xs text-gray-500">{med.dosage}</p>}
              </div>
              <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border ${css}`}>
                <Icon className="w-3 h-3" />
                {label}
              </span>
              {isProvider && log?.status === 'pending' && (
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => updateLog(log.id, 'given')}
                    className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200
                               flex items-center justify-center transition-colors"
                    title="Marcar como administrado"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => updateLog(log.id, 'missed')}
                    className="w-7 h-7 rounded-full bg-red-100 text-red-500 hover:bg-red-200
                               flex items-center justify-center transition-colors"
                    title="Marcar como não administrado"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
