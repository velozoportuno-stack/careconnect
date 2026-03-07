import { create } from 'zustand'

const ACTIVE_ROLE_KEY = 'cc_active_role'

export const useAppStore = create((set, get) => ({
  user: null,
  userRole: null,        // primary role from DB
  secondaryRole: null,   // secondary role (null if single-role user)
  activeRole: null,      // role the user is currently acting as
  bookings: [],
  notifications: [],
  pendingBooking: null,

  setUser: (user) => set({ user }),

  setUserRole: (role) => set((state) => {
    const persisted = localStorage.getItem(ACTIVE_ROLE_KEY)
    const validRoles = [role, state.secondaryRole].filter(Boolean)
    const active = (persisted && validRoles.includes(persisted)) ? persisted : role
    return { userRole: role, activeRole: active }
  }),

  setSecondaryRole: (role) => set({ secondaryRole: role }),

  setActiveRole: (role) => {
    localStorage.setItem(ACTIVE_ROLE_KEY, role)
    set({ activeRole: role })
  },

  setBookings: (bookings) => set({ bookings }),
  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications]
  })),
  clearUser: () => {
    localStorage.removeItem(ACTIVE_ROLE_KEY)
    set({ user: null, userRole: null, secondaryRole: null, activeRole: null })
  },
  setPendingBooking: (data) => set({ pendingBooking: data }),
  clearPendingBooking: () => set({ pendingBooking: null }),
}))
