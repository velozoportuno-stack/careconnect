import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import Navbar from '../components/Navbar'
import { useAppStore } from '../store/appStore'
import { supabase } from '../lib/supabase'

export default function Chat() {
  const { bookingId } = useParams()
  const { user } = useAppStore()
  const navigate = useNavigate()

  const [messages, setMessages]   = useState([])
  const [input, setInput]         = useState('')
  const [sending, setSending]     = useState(false)
  const [booking, setBooking]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)

  // ── Load booking info, ensure chat room exists, load messages ──────────────
  useEffect(() => {
    if (!user || !bookingId) return

    async function load() {
      setLoading(true)
      setError(null)

      // Booking metadata (other party name, service title)
      const { data: bk, error: bkErr } = await supabase
        .from('bookings')
        .select(`
          id, client_id, provider_id,
          client:profiles!bookings_client_id_fkey(full_name, avatar_url),
          provider:profiles!bookings_provider_id_fkey(full_name, avatar_url)
        `)
        .eq('id', bookingId)
        .single()

      if (bkErr || !bk) {
        setError('Não foi possível carregar o chat.')
        setLoading(false)
        return
      }
      setBooking(bk)

      // Ensure chat room exists (upsert-safe: ignore conflict)
      const { error: roomErr } = await supabase
        .from('chat_rooms')
        .insert({ booking_id: bookingId })
        .select()
        .maybeSingle()
      // Ignore duplicate key error (room already exists)
      if (roomErr && roomErr.code !== '23505') {
        console.warn('[Chat] chat_rooms insert error:', roomErr.message)
      }

      // Load existing messages with sender name
      const { data: msgs } = await supabase
        .from('messages')
        .select('id, sender_id, content, created_at, read_at, sender:profiles(full_name)')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })

      setMessages(msgs || [])

      // Mark all unread messages from the other party as read
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('booking_id', bookingId)
        .neq('sender_id', user.id)
        .is('read_at', null)

      setLoading(false)

      // Focus input after load
      setTimeout(() => inputRef.current?.focus(), 100)
    }

    load()
  }, [user?.id, bookingId])

  // ── Scroll to bottom on new messages ──────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Realtime subscription for new messages ─────────────────────────────────
  useEffect(() => {
    if (!bookingId || !user) return

    const channel = supabase
      .channel(`booking-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${bookingId}`,
        },
        async (payload) => {
          const newMsg = payload.new

          // Avoid duplicates from optimistic inserts
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })

          // Fetch sender name asynchronously and patch the message
          supabase
            .from('profiles')
            .select('full_name')
            .eq('id', newMsg.sender_id)
            .single()
            .then(({ data }) => {
              if (data) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === newMsg.id ? { ...m, sender: data } : m
                  )
                )
              }
            })

          // Mark as read immediately if from the other party
          if (newMsg.sender_id !== user.id) {
            await supabase
              .from('messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMsg.id)
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [bookingId, user?.id])

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const content = input.trim()
    if (!content || sending) return

    setInput('')
    setSending(true)

    // Optimistic insert for immediate display
    const optimisticId = `opt-${Date.now()}`
    const optimistic = {
      id:         optimisticId,
      booking_id: bookingId,
      sender_id:  user.id,
      content,
      read_at:    null,
      created_at: new Date().toISOString(),
      sender:     null, // will be patched via realtime or on success
    }
    setMessages((prev) => [...prev, optimistic])

    const { data, error: sendErr } = await supabase
      .from('messages')
      .insert({ booking_id: bookingId, sender_id: user.id, content })
      .select('id, sender_id, content, created_at, read_at')
      .single()

    setSending(false)

    if (sendErr) {
      // Roll back optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      console.error('[Chat] send error:', sendErr.message)
      return
    }

    // Replace optimistic message with real one
    if (data) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...data, sender: null } : m))
      )
    }
  }, [input, sending, bookingId, user?.id])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isProvider = booking ? user?.id === booking.provider_id : false
  const otherParty = booking
    ? isProvider ? booking.client : booking.provider
    : null
  const otherName  = otherParty?.full_name || '...'

  function formatTime(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString('pt-PT', {
      hour:   '2-digit',
      minute: '2-digit',
    })
  }

  function formatDateHeader(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    const today     = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString())     return 'Hoje'
    if (d.toDateString() === yesterday.toDateString()) return 'Ontem'
    return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })
  }

  // Group messages by date for date headers
  const groupedMessages = messages.reduce((acc, msg) => {
    const dateKey = new Date(msg.created_at).toDateString()
    if (!acc.length || acc[acc.length - 1].dateKey !== dateKey) {
      acc.push({ dateKey, label: formatDateHeader(msg.created_at), msgs: [] })
    }
    acc[acc.length - 1].msgs.push(msg)
    return acc
  }, [])

  // ── Loading / error states ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-4">
          <p className="text-gray-500">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary text-sm"
          >
            Voltar ao painel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="max-w-2xl mx-auto w-full px-4 flex flex-col flex-1 pb-6 pt-4"
           style={{ height: 'calc(100vh - 64px)' }}>

        {/* ── Chat header ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 mb-3
                        flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Avatar */}
          {otherParty?.avatar_url ? (
            <img
              src={otherParty.avatar_url}
              alt={otherName}
              className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 font-bold text-sm
                            flex items-center justify-center flex-shrink-0">
              {otherName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 truncate">{otherName}</p>
            <p className="text-xs text-gray-400">
              {isProvider ? 'Cliente' : 'Profissional'} · Chat do agendamento
            </p>
          </div>
        </div>

        {/* ── Messages area ── */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-4
                        overflow-y-auto space-y-1 mb-3">

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <span className="text-4xl">💬</span>
              <p className="text-sm font-medium text-gray-500">Nenhuma mensagem ainda.</p>
              <p className="text-xs text-gray-400">Começa a conversa com {otherName}!</p>
            </div>
          )}

          {groupedMessages.map(({ dateKey, label, msgs: dayMsgs }) => (
            <div key={dateKey}>
              {/* Date separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400 font-medium px-2">{label}</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {dayMsgs.map((msg) => {
                const isMine = msg.sender_id === user?.id
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col mb-2 ${isMine ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
                        ${isMine
                          ? 'bg-emerald-500 text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                        }`}
                    >
                      {msg.content}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5 px-1">
                      {msg.sender?.full_name || (isMine ? 'Tu' : otherName)}
                      {' · '}
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                )
              })}
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* ── Message input ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-3 py-2.5
                        flex items-center gap-2 flex-shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={`Mensagem para ${otherName}...`}
            className="flex-1 text-sm outline-none px-2 py-1 placeholder-gray-400 bg-transparent"
            maxLength={2000}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white
                       flex items-center justify-center flex-shrink-0
                       disabled:opacity-40 transition-colors"
          >
            {sending
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </button>
        </div>

      </div>
    </div>
  )
}
