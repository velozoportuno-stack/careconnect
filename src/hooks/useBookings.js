import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/appStore'

export const useBookings = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { user, setBookings } = useAppStore()

  const fetchBookings = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(*),
          provider:profiles!bookings_provider_id_fkey(id, full_name, avatar_url, rating),
          client:profiles!bookings_client_id_fkey(id, full_name, avatar_url)
        `)
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
        .order('scheduled_date', { ascending: false })

      if (error) throw error
      setBookings(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createBooking = async (bookingData) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert({ ...bookingData, client_id: user.id })
        .select()
        .single()
      if (error) throw error
      return { data, error: null }
    } catch (err) {
      setError(err.message)
      return { data: null, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const updateBookingStatus = async (bookingId, status) => {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .select()
      .single()
    return { data, error }
  }

  return { loading, error, fetchBookings, createBooking, updateBookingStatus }
}
