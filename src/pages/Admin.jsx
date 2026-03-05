import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Users, Calendar, Shield, BarChart2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/appStore'

export default function Admin() {
  const { user, userRole } = useAppStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ users: 0, bookings: 0, providers: 0 })
  const [recentUsers, setRecentUsers] = useState([])

  useEffect(() => {
    if (!user || userRole !== 'admin') {
      navigate('/')
      return
    }
    fetchStats()
  }, [user, userRole])

  const fetchStats = async () => {
    const [{ count: users }, { count: bookings }, { count: providers }, { data: recent }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('bookings').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'client').neq('role', 'admin'),
      supabase.from('profiles').select('id, full_name, email, role, created_at').order('created_at', { ascending: false }).limit(10),
    ])
    setStats({ users: users || 0, bookings: bookings || 0, providers: providers || 0 })
    setRecentUsers(recent || [])
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold text-primary-600">CareConnect</Link>
          <span className="badge bg-red-100 text-red-700">Admin</span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-8">Painel Administrativo</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card flex items-center gap-4">
            <Users className="w-10 h-10 text-primary-500" />
            <div>
              <p className="text-3xl font-bold">{stats.users}</p>
              <p className="text-gray-500">Usuários</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <Calendar className="w-10 h-10 text-care-green" />
            <div>
              <p className="text-3xl font-bold">{stats.bookings}</p>
              <p className="text-gray-500">Agendamentos</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <Shield className="w-10 h-10 text-care-teal" />
            <div>
              <p className="text-3xl font-bold">{stats.providers}</p>
              <p className="text-gray-500">Profissionais</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Usuários Recentes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-3 font-medium">Nome</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Tipo</th>
                  <th className="pb-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="py-3 font-medium">{u.full_name || '—'}</td>
                    <td className="py-3 text-gray-500">{u.email}</td>
                    <td className="py-3">
                      <span className="badge bg-primary-100 text-primary-700 capitalize">{u.role}</span>
                    </td>
                    <td className="py-3 text-gray-400">{new Date(u.created_at).toLocaleDateString('pt-PT')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
