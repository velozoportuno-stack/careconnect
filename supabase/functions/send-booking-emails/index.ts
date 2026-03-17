// send-booking-emails — Supabase Edge Function
// Sends booking confirmation emails to both professional and client via Resend.
//
// Required environment variables (set via `supabase secrets set`):
//   RESEND_API_KEY  — API key from resend.com
//   APP_URL         — Base URL of the app (e.g. https://careconnect.app)
//   FROM_EMAIL      — Verified sender address (e.g. noreply@careconnect.app)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const APP_URL        = Deno.env.get('APP_URL')        ?? 'https://careconnect.app'
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL')     ?? 'CareConnect <noreply@careconnect.app>'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('[send-booking-emails] RESEND_API_KEY not set — skipping email to', to)
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend ${res.status}: ${body}`)
  }
}

function formatDatePT(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-PT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function formatCurrency(amount: number, country?: string): string {
  const currency = country === 'BR' ? 'BRL' : 'EUR'
  const locale   = country === 'BR' ? 'pt-BR' : 'pt-PT'
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}

// ── Email templates ───────────────────────────────────────────────────────────

function buildProfessionalEmail(fields: {
  providerName: string
  clientName:   string
  dateStr:      string
  timeStr:      string
  duration:     string
  address:      string
  total:        string
}): string {
  const { providerName, clientName, dateStr, timeStr, duration, address, total } = fields
  return `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#0ea5e9,#0284c7);padding:32px 24px;text-align:center">
      <p style="margin:0;font-size:32px">📅</p>
      <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:800">Novo agendamento!</h1>
      <p style="margin:6px 0 0;color:#bae6fd;font-size:14px">CareConnect</p>
    </div>
    <div style="padding:28px 24px">
      <p style="font-size:15px;color:#374151;margin:0 0 6px">Olá, <strong>${providerName}</strong> 👋</p>
      <p style="font-size:14px;color:#6b7280;margin:0 0 22px">Tens um novo agendamento confirmado. Aqui estão os detalhes:</p>
      <div style="background:#eff6ff;border-left:4px solid #0ea5e9;border-radius:0 12px 12px 0;padding:18px 20px;margin-bottom:22px">
        <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#0284c7;text-transform:uppercase;letter-spacing:.08em">Detalhes do Agendamento</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151">
          <tr><td style="padding:5px 0;color:#6b7280;width:38%">👤 Cliente</td>    <td style="font-weight:600">${clientName}</td></tr>
          <tr><td style="padding:5px 0;color:#6b7280">📅 Data</td>        <td style="font-weight:600">${dateStr}</td></tr>
          ${timeStr     ? `<tr><td style="padding:5px 0;color:#6b7280">🕐 Hora</td>        <td style="font-weight:600">${timeStr}</td></tr>` : ''}
          <tr><td style="padding:5px 0;color:#6b7280">⏱ Duração</td>     <td style="font-weight:600">${duration}</td></tr>
          ${address     ? `<tr><td style="padding:5px 0;color:#6b7280">📍 Morada</td>      <td style="font-weight:600">${address}</td></tr>` : ''}
          <tr><td style="padding:5px 0;color:#6b7280">💰 Valor</td>       <td style="font-weight:700;font-size:16px;color:#0284c7">${total}</td></tr>
        </table>
      </div>
      <div style="text-align:center;margin:24px 0">
        <a href="${APP_URL}/dashboard"
           style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px">
          Abrir Painel →
        </a>
      </div>
      <p style="font-size:11px;color:#9ca3af;text-align:center;margin:0">CareConnect · Plataforma de Cuidados de Saúde</p>
    </div>
  </div>
</body>
</html>`
}

function buildClientEmail(fields: {
  clientName:    string
  providerName:  string
  serviceType:   string
  dateStr:       string
  timeStr:       string
  duration:      string
  address:       string
  total:         string
}): string {
  const { clientName, providerName, serviceType, dateStr, timeStr, duration, address, total } = fields
  return `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#10b981,#059669);padding:32px 24px;text-align:center">
      <p style="margin:0;font-size:40px">✅</p>
      <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:800">Reserva Confirmada!</h1>
      <p style="margin:6px 0 0;color:#a7f3d0;font-size:14px">CareConnect</p>
    </div>
    <div style="padding:28px 24px">
      <p style="font-size:15px;color:#374151;margin:0 0 6px">Olá, <strong>${clientName}</strong> 👋</p>
      <p style="font-size:14px;color:#6b7280;margin:0 0 22px">A tua reserva foi confirmada com sucesso. Guarda estes detalhes:</p>
      <div style="background:#f0fdf4;border-left:4px solid #10b981;border-radius:0 12px 12px 0;padding:18px 20px;margin-bottom:22px">
        <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:.08em">Detalhes da Reserva</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151">
          <tr><td style="padding:5px 0;color:#6b7280;width:38%">🩺 Profissional</td><td style="font-weight:600">${providerName}</td></tr>
          <tr><td style="padding:5px 0;color:#6b7280">🛠 Serviço</td>       <td style="font-weight:600">${serviceType}</td></tr>
          <tr><td style="padding:5px 0;color:#6b7280">📅 Data</td>          <td style="font-weight:600">${dateStr}</td></tr>
          ${timeStr     ? `<tr><td style="padding:5px 0;color:#6b7280">🕐 Hora</td>          <td style="font-weight:600">${timeStr}</td></tr>` : ''}
          <tr><td style="padding:5px 0;color:#6b7280">⏱ Duração</td>       <td style="font-weight:600">${duration}</td></tr>
          ${address     ? `<tr><td style="padding:5px 0;color:#6b7280">📍 Morada</td>        <td style="font-weight:600">${address}</td></tr>` : ''}
          <tr><td style="padding:5px 0;color:#6b7280">💰 Total pago</td>   <td style="font-weight:700;font-size:16px;color:#059669">${total}</td></tr>
        </table>
      </div>
      <div style="text-align:center;margin:24px 0">
        <a href="${APP_URL}/dashboard"
           style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px">
          Ver no Dashboard →
        </a>
      </div>
      <p style="font-size:11px;color:#9ca3af;text-align:center;margin:0">CareConnect · Plataforma de Cuidados de Saúde</p>
    </div>
  </div>
</body>
</html>`
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { bookingId } = await req.json()
    if (!bookingId) {
      return new Response(JSON.stringify({ error: 'bookingId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch booking with all required details
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select(`
        id, scheduled_date, scheduled_time, duration_hours, days_count, booking_type,
        total_price, client_address, client_postal_code, client_city,
        address, postal_code,
        client:profiles!bookings_client_id_fkey(full_name, email, country),
        provider:profiles!bookings_provider_id_fkey(full_name, email, service_type, country)
      `)
      .eq('id', bookingId)
      .single()

    if (bookingErr || !booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const {
      scheduled_date, scheduled_time, duration_hours, days_count, booking_type,
      total_price, client_address, client_postal_code, client_city,
      address, postal_code,
      client, provider,
    } = booking as Record<string, any>

    const clientName    = client?.full_name    || 'Cliente'
    const clientEmail   = client?.email        || ''
    const clientCountry = client?.country      || 'PT'
    const providerName  = provider?.full_name  || 'Profissional'
    const providerEmail = provider?.email      || ''
    const serviceType   = provider?.service_type || 'Serviço'

    const serviceAddress = [
      client_address || address,
      client_postal_code || postal_code,
      client_city,
    ].filter(Boolean).join(', ')

    const durationText = booking_type === 'days'
      ? `${days_count} dia${days_count !== 1 ? 's' : ''}`
      : `${duration_hours}h`

    const dateFormatted  = formatDatePT(scheduled_date)
    const totalFormatted = formatCurrency(parseFloat(total_price || '0'), clientCountry)

    const commonFields = {
      dateStr:  dateFormatted,
      timeStr:  scheduled_time || '',
      duration: durationText,
      address:  serviceAddress,
      total:    totalFormatted,
    }

    // Send both emails concurrently; don't fail the request if one email fails
    const results = await Promise.allSettled([
      providerEmail
        ? sendEmail(
            providerEmail,
            `📅 Novo agendamento — ${clientName}`,
            buildProfessionalEmail({ providerName, clientName, ...commonFields }),
          )
        : Promise.resolve(),
      clientEmail
        ? sendEmail(
            clientEmail,
            `✅ Reserva confirmada — ${dateFormatted}`,
            buildClientEmail({ clientName, providerName, serviceType, ...commonFields }),
          )
        : Promise.resolve(),
    ])

    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)))

    return new Response(
      JSON.stringify({ success: true, ...(errors.length ? { errors } : {}) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
