import { useState, useEffect, useMemo } from 'react'
import { Clock, MapPin, CheckCircle, Navigation } from 'lucide-react'
import { useTracking } from '../../hooks/useTracking'
import { formatDate, formatTime } from '../../utils/formatters'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Constrói um Date a partir das strings de data e hora da reserva.
 * Trata corretamente fusos horários locais.
 */
function buildScheduledDate(date, time) {
  if (!date || !time) return null
  // "2026-03-10" + "14:00:00" → Date local
  return new Date(`${date}T${time}`)
}

/** Calcula o tempo restante em segundos entre agora e um Date alvo. */
function secondsUntil(target) {
  return Math.floor((target.getTime() - Date.now()) / 1000)
}

/** Formata segundos em "HH:MM:SS" ou "MM:SS" conforme a magnitude. */
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

/** Ecrã de contagem decrescente — mostrado antes dos 30 min. */
function CountdownScreen({ booking, secondsRemaining }) {
  const display = formatCountdown(secondsRemaining)
  const [h, m, s] = display.includes(':') ? display.split(':') : ['00', display.split(':')[0], display.split(':')[1]]

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
        {display.split(':').length === 3 ? (
          <>
            <TimeUnit value={display.split(':')[0]} label="horas" />
            <Colon />
            <TimeUnit value={display.split(':')[1]} label="min" />
            <Colon />
            <TimeUnit value={display.split(':')[2]} label="seg" />
          </>
        ) : (
          <>
            <TimeUnit value={display.split(':')[0]} label="min" />
            <Colon />
            <TimeUnit value={display.split(':')[1]} label="seg" />
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

/** Ecrã de serviço concluído — mostrado após checkout. */
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

/** Mapa via iframe OpenStreetMap — sem dependências npm. */
function MapView({ location, booking }) {
  const { lat, lng, updated_at } = location

  const iframeSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`

  const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`

  const lastUpdate = updated_at
    ? new Date(updated_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null

  return (
    <div className="flex flex-col gap-3">
      {/* Indicador de estado */}
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

      {/* Mapa */}
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

      {/* Coordenadas + link externo */}
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

/** Ecrã de espera quando o profissional ainda não partilhou localização. */
function WaitingForLocation({ booking }) {
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

/**
 * ClientTrackingView
 *
 * Mostra ao cliente a localização em tempo real do profissional,
 * aplicando a seguinte lógica de acesso:
 *
 * 1. Serviço concluído (checkout) → mensagem "Serviço concluído"
 * 2. Antes de 30 min do agendamento → contador decrescente
 * 3. Dentro da janela (≥ -30 min) e sem checkout → mapa em tempo real
 *    3a. Profissional ainda não partilhou → mensagem de espera
 *    3b. Localização disponível → mapa
 *
 * @param {{ booking: object, className?: string }} props
 */
export default function ClientTrackingView({ booking, className = '' }) {
  const { providerLocation, hasCheckedOut, loading } = useTracking(booking)

  // Tempo atual — atualizado a cada segundo
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Calcular janelas de tempo
  const { scheduledDateTime, accessTime, secondsUntilAccess } = useMemo(() => {
    const scheduled = buildScheduledDate(booking?.scheduled_date, booking?.scheduled_time)
    if (!scheduled) return { scheduledDateTime: null, accessTime: null, secondsUntilAccess: 0 }

    const access = new Date(scheduled.getTime() - 30 * 60 * 1000)
    const remaining = Math.max(0, Math.floor((access.getTime() - now) / 1000))

    return { scheduledDateTime: scheduled, accessTime: access, secondsUntilAccess: remaining }
  }, [booking?.scheduled_date, booking?.scheduled_time, now])

  // ── Renderização ──────────────────────────────────────────────────────────

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
        // Estado 1: serviço concluído
        <CompletedScreen />
      ) : secondsUntilAccess > 0 ? (
        // Estado 2: antes da janela de 30 min
        <CountdownScreen booking={booking} secondsRemaining={secondsUntilAccess} />
      ) : providerLocation ? (
        // Estado 3b: localização disponível
        <MapView location={providerLocation} booking={booking} />
      ) : (
        // Estado 3a: dentro da janela mas sem localização ainda
        <WaitingForLocation booking={booking} />
      )}
    </div>
  )
}
