import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const DAY_NAMES   = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function toDateStr(d) {
  return d.toISOString().split('T')[0]
}

function addDays(d, n) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** Generate 1-hour slots: e.g. "09:00" … "16:00" for 09:00–17:00 */
function generateSlots(startTime, endTime) {
  const slots = []
  const startMin = timeToMinutes(startTime)
  const endMin   = timeToMinutes(endTime)
  for (let m = startMin; m + 60 <= endMin; m += 60) {
    const h = Math.floor(m / 60)
    slots.push(`${String(h).padStart(2, '0')}:00`)
  }
  return slots
}

/**
 * AvailabilityCalendar
 *
 * Mostra os horários disponíveis do profissional numa grelha semanal.
 * Slots ocupados são mostrados como indisponíveis.
 * Clicar num slot disponível chama onSlotSelect(dateStr, timeStr).
 *
 * @param {{ professionalId: string, onSlotSelect: (date, time) => void }} props
 */
export default function AvailabilityCalendar({ professionalId, onSlotSelect }) {
  const [weekOffset, setWeekOffset]   = useState(0)
  const [availability, setAvailability] = useState([])
  const [bookings, setBookings]       = useState([])
  const [loading, setLoading]         = useState(true)

  // 7 days starting from today + weekOffset weeks
  const days = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return Array.from({ length: 7 }, (_, i) => addDays(today, weekOffset * 7 + i))
  }, [weekOffset])

  useEffect(() => {
    if (!professionalId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const startDate = toDateStr(days[0])
      const endDate   = toDateStr(days[6])

      const [{ data: avail }, { data: bkgs }] = await Promise.all([
        supabase
          .from('professional_availability')
          .select('day_of_week, start_time, end_time')
          .eq('professional_id', professionalId)
          .eq('is_active', true),
        supabase
          .from('bookings')
          .select('scheduled_date, scheduled_time')
          .eq('provider_id', professionalId)
          .gte('scheduled_date', startDate)
          .lte('scheduled_date', endDate)
          .not('status', 'eq', 'cancelled'),
      ])

      if (!cancelled) {
        setAvailability(avail || [])
        setBookings(bkgs || [])
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [professionalId, weekOffset]) // eslint-disable-line react-hooks/exhaustive-deps

  function getSlotsForDay(date) {
    const dow  = date.getDay()
    const avail = availability.find((a) => a.day_of_week === dow)
    if (!avail) return []
    return generateSlots(avail.start_time, avail.end_time)
  }

  function isBooked(dateStr, slotTime) {
    const slotH = parseInt(slotTime.split(':')[0], 10)
    return bookings.some((b) => {
      if (b.scheduled_date !== dateStr) return false
      const bH = parseInt(b.scheduled_time?.split(':')[0] ?? '99', 10)
      return bH === slotH
    })
  }

  function isPast(date, slotTime) {
    const slotDt = new Date(`${toDateStr(date)}T${slotTime}:00`)
    return slotDt <= new Date()
  }

  const todayStr = toDateStr(new Date())

  if (loading) {
    return (
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary-600" />
          Disponibilidade
        </h2>
        <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
          A carregar disponibilidade...
        </div>
      </div>
    )
  }

  if (availability.length === 0) return null

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary-600" />
          Disponibilidade
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            disabled={weekOffset <= 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200
                       hover:bg-gray-50 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200
                       hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* 7-day grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date) => {
          const dateStr = toDateStr(date)
          const isToday = dateStr === todayStr
          const slots   = getSlotsForDay(date)

          return (
            <div key={dateStr} className="flex flex-col gap-1">
              {/* Day header */}
              <div className={`text-center py-1.5 rounded-lg mb-0.5
                              ${isToday ? 'bg-primary-600 text-white' : 'bg-gray-50 text-gray-600'}`}
              >
                <div className="text-xs font-semibold">{DAY_NAMES[date.getDay()]}</div>
                <div className={`text-base font-bold leading-none mt-0.5
                                 ${isToday ? 'text-white' : 'text-gray-900'}`}>
                  {date.getDate()}
                </div>
                <div className="text-xs opacity-60">{MONTH_NAMES[date.getMonth()]}</div>
              </div>

              {/* Slots */}
              {slots.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-3">
                  <span className="text-xs text-gray-200">—</span>
                </div>
              ) : (
                slots.map((slot) => {
                  const booked   = isBooked(dateStr, slot)
                  const past     = isPast(date, slot)
                  const disabled = booked || past

                  return (
                    <button
                      key={slot}
                      disabled={disabled}
                      onClick={() => !disabled && onSlotSelect?.(dateStr, slot)}
                      title={booked ? 'Ocupado' : past ? 'Hora passada' : `Agendar às ${slot}`}
                      className={`text-xs py-1.5 rounded-lg font-medium transition-all
                        ${booked
                          ? 'bg-gray-100 text-gray-300 cursor-not-allowed line-through'
                          : past
                            ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                            : 'bg-primary-50 text-primary-700 hover:bg-primary-100 hover:shadow-sm active:scale-95 cursor-pointer border border-primary-100'
                        }`}
                    >
                      {slot}
                    </button>
                  )
                })
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-50 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-primary-50 border border-primary-100" />
          Disponível — clica para agendar
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gray-100" />
          Ocupado
        </span>
      </div>
    </div>
  )
}
