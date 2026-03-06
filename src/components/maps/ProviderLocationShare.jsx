import { useState } from 'react'
import { MapPin, Navigation, Square, AlertCircle, CheckCircle, Loader } from 'lucide-react'
import { useProviderLocationShare } from '../../hooks/useTracking'
import { supabase } from '../../lib/supabase'

/**
 * ProviderLocationShare
 *
 * Componente exclusivo para o profissional.
 * Permite ativar/desativar a partilha de localização em tempo real.
 * Não tem qualquer restrição de horário — o profissional pode iniciar
 * a qualquer momento.
 *
 * Ao fazer checkout, insere um registo em `care_logs` com log_type='checkout'
 * e marca `has_checked_out=true` em `provider_locations`, desativando
 * automaticamente o rastreio do lado do cliente.
 *
 * @param {{ booking: object, providerId: string }} props
 */
export default function ProviderLocationShare({ booking, providerId }) {
  const { isSharing, startSharing, stopSharing, currentPosition, error } =
    useProviderLocationShare(booking?.id)

  const [checkingOut, setCheckingOut] = useState(false)
  const [checkedOut, setCheckedOut] = useState(booking?.status === 'completed')
  const [checkoutError, setCheckoutError] = useState(null)

  const handleCheckout = async () => {
    setCheckingOut(true)
    setCheckoutError(null)

    try {
      // 1. Parar a partilha de localização
      stopSharing()

      // 2. Marcar has_checked_out na tabela de localizações
      await supabase
        .from('provider_locations')
        .upsert(
          {
            booking_id: booking.id,
            has_checked_out: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'booking_id' }
        )

      // 3. Inserir registo de checkout em care_logs
      const { error: logError } = await supabase.from('care_logs').insert({
        booking_id: booking.id,
        provider_id: providerId,
        client_id: booking.client_id,
        log_type: 'checkout',
        description: 'Serviço concluído — checkout realizado.',
        latitude: currentPosition?.lat ?? null,
        longitude: currentPosition?.lng ?? null,
      })

      if (logError) throw logError

      // 4. Atualizar status da reserva
      await supabase
        .from('bookings')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', booking.id)

      setCheckedOut(true)
    } catch (err) {
      setCheckoutError(err.message || 'Erro ao fazer checkout. Tente novamente.')
    } finally {
      setCheckingOut(false)
    }
  }

  // ── Pós-checkout ──────────────────────────────────────────────────────────
  if (checkedOut) {
    return (
      <div className="card">
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-care-green/10 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-care-green" />
          </div>
          <p className="font-semibold text-gray-800">Checkout realizado</p>
          <p className="text-sm text-gray-400">
            O serviço foi marcado como concluído. O rastreio do cliente foi desativado.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card space-y-4">
      <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
        <Navigation className="w-4 h-4 text-primary-500" />
        Partilha de Localização
      </h3>

      {/* Estado atual */}
      <div className={`flex items-center gap-3 p-3 rounded-lg ${isSharing ? 'bg-care-green/10' : 'bg-gray-50'}`}>
        {isSharing ? (
          <>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-care-green opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-care-green" />
            </span>
            <span className="text-sm font-medium text-care-green">Partilha ativa</span>
          </>
        ) : (
          <>
            <span className="h-3 w-3 rounded-full bg-gray-300" />
            <span className="text-sm text-gray-500">Partilha inativa</span>
          </>
        )}
      </div>

      {/* Coordenadas atuais */}
      {currentPosition && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <MapPin className="w-3 h-3" />
          <span>
            {currentPosition.lat.toFixed(5)}, {currentPosition.lng.toFixed(5)}
            {currentPosition.accuracy && ` (±${Math.round(currentPosition.accuracy)}m)`}
          </span>
        </div>
      )}

      {/* Erros de geolocalização */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Botões de controlo */}
      <div className="flex flex-col gap-2">
        {!isSharing ? (
          <button
            onClick={startSharing}
            className="btn-primary flex items-center justify-center gap-2 py-2.5"
          >
            <Navigation className="w-4 h-4" />
            Iniciar Partilha de Localização
          </button>
        ) : (
          <button
            onClick={stopSharing}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold transition-colors"
          >
            <Square className="w-4 h-4" />
            Pausar Partilha
          </button>
        )}

        {/* Checkout */}
        <button
          onClick={handleCheckout}
          disabled={checkingOut}
          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-care-green text-white font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-60"
        >
          {checkingOut ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          {checkingOut ? 'A finalizar...' : 'Fazer Checkout (Fim do Serviço)'}
        </button>
      </div>

      {checkoutError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{checkoutError}</span>
        </div>
      )}

      <p className="text-xs text-gray-400">
        O cliente só consegue ver a sua localização a partir de 30 minutos antes do horário agendado.
      </p>
    </div>
  )
}
