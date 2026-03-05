import { Link } from 'react-router-dom'
import { Heart, Shield, Clock, Star } from 'lucide-react'

const features = [
  {
    icon: Heart,
    title: 'Cuidadores Certificados',
    description: 'Todos os profissionais são verificados e têm experiência comprovada em cuidados de saúde.',
  },
  {
    icon: Shield,
    title: 'Seguro e Confiável',
    description: 'Pagamentos seguros via Stripe. Cobertura de seguro para todos os serviços agendados.',
  },
  {
    icon: Clock,
    title: 'Disponível 24/7',
    description: 'Encontre cuidadores disponíveis a qualquer hora, incluindo emergências e fins de semana.',
  },
  {
    icon: Star,
    title: 'Avaliações Reais',
    description: 'Leia avaliações de clientes reais antes de contratar. Transparência total.',
  },
]

const categories = [
  { label: 'Cuidador de Idosos', icon: '👴', color: 'bg-blue-50 text-blue-700' },
  { label: 'Enfermagem', icon: '🏥', color: 'bg-green-50 text-green-700' },
  { label: 'Limpeza', icon: '🧹', color: 'bg-yellow-50 text-yellow-700' },
  { label: 'Fisioterapia', icon: '💪', color: 'bg-purple-50 text-purple-700' },
]

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <span className="text-xl font-bold text-primary-600">CareConnect</span>
          <div className="flex items-center gap-4">
            <Link to="/search" className="text-gray-600 hover:text-gray-900">Procurar</Link>
            <Link to="/login" className="text-gray-600 hover:text-gray-900">Entrar</Link>
            <Link to="/register" className="btn-primary text-sm">Cadastrar</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-care-teal text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Cuidados ao seu alcance
          </h1>
          <p className="text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
            Conectamos famílias com cuidadores certificados, enfermeiros e assistentes domésticos
            em Portugal e Brasil.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/search" className="bg-white text-primary-600 font-semibold py-3 px-8 rounded-lg hover:bg-primary-50 transition-colors">
              Encontrar Cuidador
            </Link>
            <Link to="/register" className="border-2 border-white text-white font-semibold py-3 px-8 rounded-lg hover:bg-primary-700 transition-colors">
              Sou Profissional
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center mb-10">Categorias de Serviço</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link key={cat.label} to={`/search?category=${cat.label}`}
                className={`flex flex-col items-center p-6 rounded-xl ${cat.color} hover:opacity-90 transition-opacity cursor-pointer`}>
                <span className="text-4xl mb-3">{cat.icon}</span>
                <span className="font-semibold text-center">{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center mb-12">Por que escolher o CareConnect?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f) => (
              <div key={f.title} className="card text-center">
                <div className="flex justify-center mb-4">
                  <f.icon className="w-10 h-10 text-primary-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary-600 text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-primary-100 mb-8">
            Crie a sua conta gratuita e encontre o cuidador ideal para a sua família.
          </p>
          <Link to="/register" className="bg-white text-primary-600 font-semibold py-3 px-8 rounded-lg hover:bg-primary-50 transition-colors inline-block">
            Criar Conta Grátis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 text-center text-sm">
        <p>© 2026 CareConnect. Todos os direitos reservados. Portugal 🇵🇹 · Brasil 🇧🇷</p>
      </footer>
    </div>
  )
}
