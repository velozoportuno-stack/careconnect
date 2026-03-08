import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Heart, Search, LayoutDashboard, LogOut, Menu, X, UserCircle } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const { user, userRole } = useAppStore()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    setMobileOpen(false)
    await signOut()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  const linkClass = (path) =>
    `text-sm font-medium transition-colors ${
      isActive(path) ? 'text-primary-600' : 'text-gray-600 hover:text-gray-900'
    }`

  const roleLabel = userRole === 'professional' ? 'Profissional' : userRole === 'client' ? 'Cliente' : null
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0]

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <Heart className="w-5 h-5 text-primary-600" fill="currentColor" />
          <span className="text-lg font-bold text-gray-900">
            Care<span className="text-primary-600">Connect</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-6">
          {userRole !== 'professional' && (
            <Link to="/search" className={linkClass('/search')}>
              <span className="flex items-center gap-1.5">
                <Search className="w-4 h-4" /> Pesquisar
              </span>
            </Link>
          )}

          {user ? (
            <>
              <Link to="/dashboard" className={linkClass('/dashboard')}>
                <span className="flex items-center gap-1.5">
                  <LayoutDashboard className="w-4 h-4" /> Painel
                </span>
              </Link>

              <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
                <UserCircle className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-700 font-medium">
                  Olá, {firstName}
                  {roleLabel && (
                    <span className="ml-1 text-xs text-primary-600 font-normal">· {roleLabel}</span>
                  )}
                </span>
              </div>

              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500
                           font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Entrar
              </Link>
              <Link to="/register" className="btn-primary text-sm py-2 px-4">
                Cadastrar
              </Link>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-gray-100 bg-white px-4 py-4 flex flex-col gap-3">
          {!user && (
            <Link to="/" onClick={() => setMobileOpen(false)}
              className="text-sm font-medium text-gray-700 py-2">
              Início
            </Link>
          )}
          {userRole !== 'professional' && (
            <Link to="/search" onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 py-2">
              <Search className="w-4 h-4" /> Pesquisar
            </Link>
          )}

          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 py-2">
                <LayoutDashboard className="w-4 h-4" /> Painel
              </Link>
              <button onClick={handleSignOut}
                className="flex items-center gap-2 text-sm font-medium text-red-500 py-2 text-left">
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMobileOpen(false)}
                className="text-sm font-medium text-gray-700 py-2">
                Entrar
              </Link>
              <Link to="/register" onClick={() => setMobileOpen(false)}
                className="btn-primary text-sm text-center">
                Cadastrar
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
