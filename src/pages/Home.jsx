import { Link } from 'react-router-dom'
import { Heart, Shield, Star, CheckCircle, Users, ArrowRight } from 'lucide-react'

const services = [
  {
    icon: '🧓',
    title: 'Cuidador(a) de Idosos',
    desc: 'Apoio diário, companhia e assistência pessoal a idosos no conforto de casa.',
    role: 'caregiver',
    color: 'from-amber-50 to-orange-50 border-amber-200',
    badge: 'text-amber-700 bg-amber-100',
  },
  {
    icon: '🩺',
    title: 'Enfermeiro(a)',
    desc: 'Cuidados de saúde domiciliários por profissionais de enfermagem certificados.',
    role: 'nurse',
    color: 'from-blue-50 to-cyan-50 border-blue-200',
    badge: 'text-blue-700 bg-blue-100',
  },
  {
    icon: '🧹',
    title: 'Assistente de Limpeza',
    desc: 'Casa impecável com profissionais de confiança, agendados ao teu ritmo.',
    role: 'cleaner',
    color: 'from-primary-50 to-teal-50 border-primary-200',
    badge: 'text-primary-700 bg-primary-100',
  },
]

const trust = [
  { icon: Shield,      label: 'Profissionais verificados' },
  { icon: Star,        label: 'Avaliações reais' },
  { icon: CheckCircle, label: 'Pagamento seguro' },
  { icon: Users,       label: '+500 famílias satisfeitas' },
]

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Nav ── */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-primary-600" fill="currentColor" />
            <span className="text-xl font-bold text-gray-900">
              Care<span className="text-primary-600">Connect</span>
            </span>
          </div>
          <Link
            to="/login"
            className="text-sm font-semibold text-primary-600 border border-primary-300
                       px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors"
          >
            Entrar
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="bg-gradient-to-b from-primary-600 to-primary-700 text-white pt-20 pb-28 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm
                          text-white text-sm font-medium px-4 py-1.5 rounded-full mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Marketplace de cuidados em Portugal
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-5">
            Encontra o cuidador ideal<br />para a tua família
          </h1>

          <p className="text-lg text-primary-100 mb-10 max-w-xl mx-auto">
            Cuidadores de idosos, enfermeiros e assistentes de limpeza
            verificados, perto de ti, ao preço certo.
          </p>

          {/* 3 CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register?role=client"
              className="flex items-center justify-center gap-2
                         bg-white text-primary-700 font-semibold
                         px-7 py-4 rounded-xl shadow-lg
                         hover:bg-primary-50 active:scale-95 transition-all"
            >
              Sou Cliente — Procurar Serviços
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/register?role=professional"
              className="flex items-center justify-center gap-2
                         bg-primary-500 text-white font-semibold
                         px-7 py-4 rounded-xl border-2 border-primary-400
                         hover:bg-primary-400 active:scale-95 transition-all"
            >
              Sou Profissional — Cadastrar-me
            </Link>
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <div className="bg-gray-900 py-4">
        <div className="max-w-4xl mx-auto px-4 flex flex-wrap justify-center gap-6">
          {trust.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-gray-300 text-sm">
              <Icon className="w-4 h-4 text-primary-400" />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Services ── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-3">
            Que serviço precisas?
          </h2>
          <p className="text-center text-gray-500 mb-12">
            Escolhe a categoria e encontra o profissional certo para ti.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {services.map((s) => (
              <Link
                key={s.role}
                to={`/search?category=${s.role}`}
                className={`group flex flex-col p-7 rounded-2xl border bg-gradient-to-br ${s.color}
                            hover:shadow-lg active:scale-95 transition-all duration-200`}
              >
                <span className="text-5xl mb-4">{s.icon}</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full w-fit mb-3 ${s.badge}`}>
                  Ver profissionais
                </span>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-600 flex-1">{s.desc}</p>
                <div className="flex items-center gap-1 mt-4 text-gray-700 text-sm font-medium
                                group-hover:gap-2 transition-all">
                  Explorar <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">Como funciona?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Pesquisa', desc: 'Filtra por tipo de serviço e cidade. Vê fotos, preços e avaliações.' },
              { step: '2', title: 'Agenda', desc: 'Escolhe a data e hora no perfil do profissional e confirma a reserva.' },
              { step: '3', title: 'Acompanha', desc: 'Vê a localização em tempo real do profissional durante o serviço.' },
            ].map((item) => (
              <div key={item.step} className="card text-center">
                <div className="w-12 h-12 rounded-full bg-primary-600 text-white font-bold text-lg
                                flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-16 px-4 bg-primary-600 text-white text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Começa hoje, gratuitamente</h2>
          <p className="text-primary-100 mb-8">
            Cria a tua conta em menos de 2 minutos e encontra o cuidador ideal.
          </p>
          <Link
            to="/register?role=client"
            className="inline-flex items-center gap-2 bg-white text-primary-700 font-bold
                       px-8 py-4 rounded-xl hover:bg-primary-50 active:scale-95 transition-all"
          >
            Criar conta gratuita <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-500 py-8 text-center text-sm mt-auto">
        <p>© 2026 CareConnect — Marketplace de Cuidados em Portugal</p>
      </footer>
    </div>
  )
}
