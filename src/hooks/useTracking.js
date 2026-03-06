import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * useTracking — rastreio em tempo real da localização do profissional.
 *
 * Subscreve a tabela `provider_locations` via Supabase Realtime filtrada
 * pela reserva. Deteta automaticamente o checkout através do campo
 * `has_checked_out` da linha ou de uma entrada em `care_logs`.
 *
 * @param {object} booking  Objeto da reserva (id, provider_id, scheduled_date,
 *                          scheduled_time, status)
 * @returns {{ providerLocation, hasCheckedOut, loading, error }}
 */
export const useTracking = (booking) => {
  const [providerLocation, setProviderLocation] = useState(null) // { lat, lng, updated_at }
  const [hasCheckedOut, setHasCheckedOut] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!booking?.id || !booking?.provider_id) {
      setLoading(false)
      return
    }

    // Booking concluído via status — não é necessário subscrever
    if (booking.status === 'completed') {
      setHasCheckedOut(true)
      setLoading(false)
      return
    }

    let cancelled = false

    const init = async () => {
      try {
        // 1. Carregar localização atual (se existir)
        const { data: locRow } = await supabase
          .from('provider_locations')
          .select('latitude, longitude, has_checked_out, updated_at')
          .eq('booking_id', booking.id)
          .single()

        if (!cancelled) {
          if (locRow) {
            if (locRow.has_checked_out) {
              setHasCheckedOut(true)
            } else if (locRow.latitude != null && locRow.longitude != null) {
              setProviderLocation({
                lat: locRow.latitude,
                lng: locRow.longitude,
                updated_at: locRow.updated_at,
              })
            }
          }
          setLoading(false)
        }

        // 2. Verificar se já há um checkout em care_logs
        const { data: checkoutLog } = await supabase
          .from('care_logs')
          .select('id')
          .eq('booking_id', booking.id)
          .eq('log_type', 'checkout')
          .maybeSingle()

        if (!cancelled && checkoutLog) {
          setHasCheckedOut(true)
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
        setLoading(false)
      }
    }

    init()

    // 3. Subscrição Realtime — provider_locations
    const channel = supabase
      .channel(`tracking:${booking.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'provider_locations',
          filter: `booking_id=eq.${booking.id}`,
        },
        (payload) => {
          const row = payload.new
          if (!row) return

          if (row.has_checked_out) {
            setHasCheckedOut(true)
            setProviderLocation(null)
            return
          }

          if (row.latitude != null && row.longitude != null) {
            setProviderLocation({
              lat: row.latitude,
              lng: row.longitude,
              updated_at: row.updated_at,
            })
          }
        }
      )
      // 4. Subscrição Realtime — care_logs (deteção de checkout)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'care_logs',
          filter: `booking_id=eq.${booking.id}`,
        },
        (payload) => {
          if (payload.new?.log_type === 'checkout') {
            setHasCheckedOut(true)
            setProviderLocation(null)
          }
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [booking?.id, booking?.provider_id, booking?.status])

  return { providerLocation, hasCheckedOut, loading, error }
}

/**
 * useProviderLocationShare — partilha de localização pelo profissional.
 *
 * Usa `navigator.geolocation.watchPosition` para enviar atualizações
 * contínuas para a tabela `provider_locations` via upsert.
 * Sem qualquer restrição de horário — o profissional pode ativar
 * a partilha em qualquer momento.
 *
 * @param {string} bookingId  ID da reserva ativa
 * @returns {{ isSharing, startSharing, stopSharing, currentPosition, error }}
 */
export const useProviderLocationShare = (bookingId) => {
  const [isSharing, setIsSharing] = useState(false)
  const [currentPosition, setCurrentPosition] = useState(null)
  const [error, setError] = useState(null)
  const watchIdRef = useRef(null)

  const startSharing = () => {
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada neste dispositivo.')
      return
    }

    setError(null)
    setIsSharing(true)

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        setCurrentPosition({ lat: latitude, lng: longitude, accuracy })

        await supabase.from('provider_locations').upsert(
          {
            booking_id: bookingId,
            latitude,
            longitude,
            accuracy,
            has_checked_out: false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'booking_id' }
        )
      },
      (err) => {
        setError(`Erro de localização: ${err.message}`)
        setIsSharing(false)
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
  }

  const stopSharing = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsSharing(false)
  }

  // Limpar ao desmontar
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  return { isSharing, startSharing, stopSharing, currentPosition, error }
}
