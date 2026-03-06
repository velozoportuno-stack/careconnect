import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store/appStore'
import { useAuth } from './hooks/useAuth'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Search from './pages/Search'
import Profile from './pages/Profile'
import Booking from './pages/Booking'
import Admin from './pages/Admin'
import AuthCallback from './pages/AuthCallback'
import CompleteProfile from './pages/CompleteProfile'

function PrivateRoute({ children }) {
  const { user } = useAppStore()
  return user ? children : <Navigate to="/login" />
}

export default function App() {
  useAuth() // inicializa listener de auth

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                 element={<Home />} />
        <Route path="/login"            element={<Login />} />
        <Route path="/register"         element={<Register />} />
        <Route path="/search"           element={<Search />} />
        <Route path="/profile/:id"      element={<Profile />} />
        <Route path="/auth/callback"    element={<AuthCallback />} />
        <Route path="/complete-profile" element={<PrivateRoute><CompleteProfile /></PrivateRoute>} />
        <Route path="/dashboard"        element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/booking"          element={<PrivateRoute><Booking /></PrivateRoute>} />
        <Route path="/admin"            element={<PrivateRoute><Admin /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
