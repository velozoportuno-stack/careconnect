import { create } from 'zustand'

export const useAppStore = create((set) => ({
  user: null,
  userRole: null,
  bookings: [],
  notifications: [],
  pendingBooking: null,   // draft booking data during checkout flow

  setUser: (user) => set({ user }),
  setUserRole: (role) => set({ userRole: role }),
  setBookings: (bookings) => set({ bookings }),
  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications]
  })),
  clearUser: () => set({ user: null, userRole: null }),
  setPendingBooking: (data) => set({ pendingBooking: data }),
  clearPendingBooking: () => set({ pendingBooking: null }),
}))
