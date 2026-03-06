import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Calendar, Clock, MapPin, User, Star, Plus, Trash2,
  ChevronRight, Stethoscope, FileText, Pill,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { useAppStore } from '../store/appStore'
import { formatCurrency, formatDate } from '../utils/formatters'

const ROLE_LABEL = {
  caregiver: 'Cuidador(a) de Idosos',
  nurse:     'Enfermeiro(a)',
  cleaner:   'Assistente de Limpeza',
}

const needsPatient = (role) => role === 'caregiver' || role === 'nurse'

function emptyMed() {
  return { name: '', dosage: '', frequency: '', times: ['08:00'] }
}

export default function Booking() {
  const { user, pendingBooking, setPendingBooking } = useAppStore()
  const navigate = useNavigate()

  const [tab, setTab]           = useState('summary') // 'summary' | 'patient'
  const [patient, setPatient]   = useState({
    name: '', birth_date: '', medical_conditions: '', observations: '',
  })
  const [meds, setMeds]         = useState([emptyMed()])
  const [error, setError]       = useState(null)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (!pendingBooking) { navigate('/search'); return }
  }, [])

  if (!pendingBooking) return null

  const { provider, service, date, time, duration, address, notes, totalPrice, hourlyRate } = pendingBooking
  const showPatientTab = needsPatient(provider?.role)

  function updateMed(i, field, val) {
    setMeds((prev) => prev.map((m, idx) => idx === i ? { ...m, [field]: val } : m))
  }

  function addTimeToMed(i) {
    setMeds((prev) => prev.map((m, idx) => idx === i ? { ...m, times: [...m.times, '12:00'] } : m))
  }

  function removeTimeFromMed(i, ti) {
    setMeds((prev) => prev.map((m, idx) =>
      idx === i ? { ...m, times: m.times.filter((_, tidx) => tidx !== ti) } : m
    ))
  }

  function removeMed(i) {
    setMeds((prev) => prev.filter((_, idx) => idx !== i))
  }

  function handleContinue() {
    if (showPatientTab && !patient.name.trim()) {
      setTab('patient')
      setError('Preenche o nome do paciente para continuar.')
      return
    }
    setError(null)
    // Save patient data to pending booking
    setPendingBooking({
      ...pendingBooking,
      patientData: showPatientTab ? { ...patient, medications: meds } : null,
    })
    navigate('/payment')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center
                       hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-600 rotate-180" />
          </button>
          <h1 className="text-2xl font-extrabold text-gray-900">Confirmar Agendamento</h1>
        </div>

        {/* Provider card */}
        <div className="card mb-4 flex items-center gap-4">
          {provider?.avatar_url ? (
            <img
              src={provider.avatar_url}
              alt={provider.full_name}
              className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 shadow-sm"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-primary-100 text-primary-700 font-bold text-xl
                            flex items-center justify-center flex-shrink-0">
              {provider?.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-lg">{provider?.full_name}</p>
            <p className="text-sm text-primary-600 font-medium">{ROLE_LABEL[provider?.role] || provider?.role}</p>
            {service && <p className="text-sm text-gray-500 mt-0.5">{service.title}</p>}
            {provider?.rating > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="text-sm font-semibold text-gray-700">{Number(provider.rating).toFixed(1)}</span>
                <span className="text-xs text-gray-400">({provider.total_reviews} avaliações)</span>
              </div>
            )}
          </div>
          {hourlyRate > 0 && (
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-extrabold text-primary-600">{formatCurrency(hourlyRate)}</p>
              <p className="text-xs text-gray-400">/hora</p>
            </div>
          )}
        </div>

        {/* Booking summary */}
        <div className="card mb-4">
          <h2 className="font-bold text-gray-900 mb-4">Detalhes do Agendamento</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-gray-700">
              <Calendar className="w-4 h-4 text-primary-500 flex-shrink-0" />
              <span className="font-medium">Data:</span>
              <span>{date ? formatDate(date) : '—'}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <Clock className="w-4 h-4 text-primary-500 flex-shrink-0" />
              <span className="font-medium">Hora:</span>
              <span>{time} · {duration}h de serviço</span>
            </div>
            {address && (
              <div className="flex items-center gap-3 text-gray-700">
                <MapPin className="w-4 h-4 text-primary-500 flex-shrink-0" />
                <span className="font-medium">Morada:</span>
                <span className="truncate">{address}</span>
              </div>
            )}
            {notes && (
              <div className="flex items-start gap-3 text-gray-700">
                <FileText className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                <span className="font-medium">Notas:</span>
                <span>{notes}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
            <span className="text-gray-600 font-medium">
              {formatCurrency(hourlyRate)} × {duration}h
            </span>
            <span className="text-2xl font-extrabold text-primary-600">{formatCurrency(totalPrice)}</span>
          </div>
        </div>

        {/* Patient data tabs — only for caregiver/nurse */}
        {showPatientTab && (
          <div className="card mb-4">
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
              {[
                { key: 'summary', label: 'Resumo', Icon: FileText },
                { key: 'patient', label: 'Dados do Paciente', Icon: User },
                { key: 'meds',    label: 'Medicamentos', Icon: Pill },
              ].map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => { setTab(key); setError(null) }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition-all
                              ${tab === key ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {tab === 'patient' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <Stethoscope className="w-4 h-4 flex-shrink-0" />
                  Dados clínicos confidenciais — só visíveis para cliente e profissional.
                </div>
                <div>
                  <label className="input-label">Nome do Paciente *</label>
                  <input
                    className="input-field"
                    placeholder="Nome completo"
                    value={patient.name}
                    onChange={(e) => setPatient((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="input-label">Data de Nascimento</label>
                  <input
                    type="date"
                    className="input-field"
                    value={patient.birth_date}
                    onChange={(e) => setPatient((p) => ({ ...p, birth_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="input-label">Condições Médicas</label>
                  <textarea
                    rows={3}
                    className="input-field resize-none text-sm"
                    placeholder="Diabetes, hipertensão, Alzheimer..."
                    value={patient.medical_conditions}
                    onChange={(e) => setPatient((p) => ({ ...p, medical_conditions: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="input-label">Observações Gerais</label>
                  <textarea
                    rows={3}
                    className="input-field resize-none text-sm"
                    placeholder="Alergias, preferências, instruções especiais..."
                    value={patient.observations}
                    onChange={(e) => setPatient((p) => ({ ...p, observations: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {tab === 'meds' && (
              <div className="space-y-5">
                {meds.map((med, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3 relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-gray-700">Medicamento {i + 1}</span>
                      {meds.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMed(i)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="input-label">Nome *</label>
                        <input
                          className="input-field text-sm"
                          placeholder="Metformina"
                          value={med.name}
                          onChange={(e) => updateMed(i, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="input-label">Dosagem</label>
                        <input
                          className="input-field text-sm"
                          placeholder="500mg"
                          value={med.dosage}
                          onChange={(e) => updateMed(i, 'dosage', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="input-label">Frequência</label>
                      <input
                        className="input-field text-sm"
                        placeholder="3x ao dia, após as refeições"
                        value={med.frequency}
                        onChange={(e) => updateMed(i, 'frequency', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="input-label">Horários dos alarmes</label>
                      <div className="space-y-2">
                        {med.times.map((t, ti) => (
                          <div key={ti} className="flex items-center gap-2">
                            <input
                              type="time"
                              className="input-field text-sm flex-1"
                              value={t}
                              onChange={(e) => {
                                const updated = [...med.times]
                                updated[ti] = e.target.value
                                updateMed(i, 'times', updated)
                              }}
                            />
                            {med.times.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeTimeFromMed(i, ti)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addTimeToMed(i)}
                          className="flex items-center gap-1.5 text-xs text-primary-600 font-medium hover:underline"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Adicionar horário
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setMeds((prev) => [...prev, emptyMed()])}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200
                             rounded-xl text-sm font-medium text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar medicamento
                </button>
              </div>
            )}

            {tab === 'summary' && (
              <div className="text-center py-6 text-gray-500">
                <User className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium">
                  {patient.name
                    ? <>Paciente: <strong className="text-gray-800">{patient.name}</strong></>
                    : 'Preenche os dados do paciente no separador "Dados do Paciente"'}
                </p>
                {meds.some((m) => m.name) && (
                  <p className="text-xs text-gray-400 mt-1">
                    {meds.filter((m) => m.name).length} medicamento(s) configurado(s)
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="text-red-500 text-sm mb-4 px-1">{error}</p>
        )}

        <button
          onClick={handleContinue}
          className="btn-primary w-full text-base py-4"
        >
          Ir para Pagamento
          <ChevronRight className="w-5 h-5" />
        </button>

        <p className="text-center text-xs text-gray-400 mt-3">
          Pagamento seguro via Stripe · SSL encriptado
        </p>
      </main>
    </div>
  )
}
