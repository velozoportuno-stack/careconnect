import { useState, useEffect, useMemo } from 'react'
import { Clock, MapPin, CheckCircle, Navigation } from 'lucide-react'
import { useTracking } from '../../hooks/useTracking'
import { formatDate, formatTime } from '../../utils/formatters'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildScheduledDate(date, time) {
  if (!date || !time) return null
  return new Date(`${date}T${time}`)
}

function formatCountdown(totalSeconds) {
  if (totalSeconds <= 0) return '00:00'
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n) => String(n).padStart(2, '0')
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

// ─── Sub-componentes ───────────────────────────────────────────────────────────

function CountdownScreen({ booking, secondsRemaining }) {
  const display = formatCountdown(secondsRemaining)
  const parts = display.split(':')

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-10 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
        <Clock className="w-8 h-8 text-primary-600" />
      </div>

      <div>
        <p className="text-gray-700 font-medium text-lg">
          O rastreio ficará disponível 30 minutos antes do seu agendamento
        </p>
        <p className="text-gray-400 text-sm mt-1">
          Agendado para{' '}
          <span className="font-semibold text-gray-600">
            {formatDate(booking.scheduled_date)} às {formatTime(booking.scheduled_time)}
          </span>
        </p>
      </div>

      {/* Contador */}
      <div className="flex items-center gap-2 bg-primary-50 border border-primary-100 rounded-2xl px-6 py-4">
        {parts.length === 3 ? (
          <>
            <TimeUnit value={parts[0]} label="horas" />
            <Colon />
            <TimeUnit value={parts[1]} label="min" />
            <Colon />
            <TimeUnit value={parts[2]} label="seg" />
          </>
        ) : (
          <>
            <TimeUnit value={parts[0]} label="min" />
            <Colon />
            <TimeUnit value={parts[1]} label="seg" />
          </>
        )}
      </div>

      <p className="text-xs text-gray-400">
        O mapa com a localização em tempo real do profissional ativará automaticamente.
      </p>
    </div>
  )
}

function TimeUnit({ value, label }) {
  return (
    <div className="flex flex-col items-center min-w-[3rem]">
      <span className="text-3xl font-bold text-primary-700 tabular-nums">{value}</span>
      <span className="text-xs text-primary-400 mt-0.5">{label}</span>
    </div>
  )
}

function Colon() {
  return <span className="text-2xl font-bold text-primary-400 pb-4">:</span>
}

function CompletedScreen() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-10 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-care-green/10 flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-care-green" />
      </div>
      <p className="text-lg font-semibold text-gray-800">Serviço concluído</p>
      <p className="text-sm text-gray-400">
        O profissional finalizou o serviço. O rastreio foi desativado.
      </p>
    </div>
  )
}

function MapView({ location }) {
  const { lat, lng, updated_at } = location

  const iframeSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`
  const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`
  const lastUpdate = updated_at
    ? new Date(updated_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-care-green opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-care-green" />
          </span>
          <span className="text-sm font-medium text-gray-700">Localização em tempo real</span>
        </div>
        {lastUpdate && (
          <span className="text-xs text-gray-400">Atualizado às {lastUpdate}</span>
        )}
      </div>

      <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: 320 }}>
        <iframe
          title="Localização do profissional"
          src={iframeSrc}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400 px-1">
        <div className="flex items-center gap-1">
          <Navigation className="w-3 h-3" />
          <span>{lat.toFixed(5)}, {lng.toFixed(5)}</span>
        </div>
        <a
          href={mapsLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-primary-600 hover:underline"
        >
          <MapPin className="w-3 h-3" />
          Abrir no Google Maps
        </a>
      </div>
    </div>
  )
}

function WaitingForLocation() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
        <MapPin className="w-6 h-6 text-gray-400" />
      </div>
      <div>
        <p className="font-medium text-gray-700">A aguardar localização do profissional</p>
        <p className="text-sm text-gray-400 mt-1">
          O mapa aparecerá assim que o profissional ativar a partilha de localização.
        </p>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-primary-300 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function ClientTrackingView({ booking, className = '' }) {
  const { providerLocation, hasCheckedOut, loading } = useTracking(booking)

  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const secondsUntilAccess = useMemo(() => {
    const scheduled = buildScheduledDate(booking?.scheduled_date, booking?.scheduled_time)
    if (!scheduled) return 0
    const access = new Date(scheduled.getTime() - 30 * 60 * 1000)
    return Math.max(0, Math.floor((access.getTime() - now) / 1000))
  }, [booking?.scheduled_date, booking?.scheduled_time, now])

  return (
    <div className={`card ${className}`}>
      <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Navigation className="w-4 h-4 text-primary-500" />
        Rastreio do Profissional
      </h3>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-gray-400 text-sm">
          A carregar...
        </div>
      ) : hasCheckedOut ? (
        <CompletedScreen />
      ) : secondsUntilAccess > 0 ? (
        <CountdownScreen booking={booking} secondsRemaining={secondsUntilAccess} />
      ) : providerLocation ? (
        <MapView location={providerLocation} />
      ) : (
        <WaitingForLocation />
      )}
    </div>
  )
}
