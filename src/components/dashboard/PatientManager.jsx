// DO NOT REMOVE existing features
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Plus, Trash2, Bell, CheckCircle, XCircle, ChevronDown, ChevronUp,
  User2, Pill, Loader2, Volume2, VolumeX,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/appStore'

// ── Audio ─────────────────────────────────────────────────────────────────────
function playBeep() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.5, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.8)
  } catch (_) { /* audio context unavailable */ }
}

// ── Date helpers ──────────────────────────────────────────────────────────────
// Returns YYYY-MM-DD in local timezone (not UTC)
function localToday() {
  return new Date().toLocaleDateString('en-CA')
}

// Converts HH:MM + today's local date to a UTC ISO timestamp
function makeScheduledTime(hhMM) {
  return new Date(`${localToday()}T${hhMM}:00`).toISOString()
}

// ── PatientManager ────────────────────────────────────────────────────────────
// isProvider=true  → professional view: add/remove patients and medications, confirm alarms
// isProvider=false → client view: read-only access to their own patient records
export default function PatientManager({ isProvider }) {
  const { user } = useAppStore()

  const [patients,    setPatients]    = useState([])
  const [medications, setMedications] = useState({})  // { patient_id: [...meds] }
  const [alarms,      setAlarms]      = useState({})  // { patient_id: [...alarms for today] }
  const [bookings,    setBookings]    = useState([])  // provider's bookings for linking

  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [soundOn,  setSoundOn]  = useState(true)
  const [expanded, setExpanded] = useState(null)      // patient_id currently expanded

  // Form visibility
  const [showAddPatient, setShowAddPatient] = useState(false)
  const [addMedFor,      setAddMedFor]      = useState(null)  // patient_id

  // New patient form
  const [newPatient, setNewPatient] = useState({
    name: '', date_of_birth: '', medical_conditions: '', observations: '', booking_id: '',
  })

  // New medication form
  const [newMed, setNewMed] = useState({
    name: '', dosage: '', frequency: '', times: ['08:00'],
  })

  const alarmFiredRef = useRef(new Set())

  // ── Fetch helpers ─────────────────────────────────────────────────────────

  const fetchAlarms = useCallback(async (patientIds) => {
    if (!patientIds.length) return
    const today = localToday()
    const { data } = await supabase
      .from('medication_alarms')
      .select('*')
      .in('patient_id', patientIds)
      .gte('scheduled_time', `${today}T00:00:00.000Z`)
      .lte('scheduled_time', `${today}T23:59:59.999Z`)

    const byPatient = {}
    for (const a of (data || [])) {
      if (!byPatient[a.patient_id]) byPatient[a.patient_id] = []
      byPatient[a.patient_id].push(a)
    }
    setAlarms(byPatient)
  }, [])

  // Ensure one alarm record exists per medication×time for today
  const ensureTodayAlarms = useCallback(async (allMeds) => {
    if (!allMeds.length) return
    const today = localToday()
    const { data: existing } = await supabase
      .from('medication_alarms')
      .select('medication_id, scheduled_time')
      .in('medication_id', allMeds.map((m) => m.id))
      .gte('scheduled_time', `${today}T00:00:00.000Z`)
      .lte('scheduled_time', `${today}T23:59:59.999Z`)

    const toInsert = []
    for (const med of allMeds) {
      for (const t of (med.times || [])) {
        const scheduledTime = makeScheduledTime(t)
        const alreadyExists = existing?.some(
          (e) => e.medication_id === med.id &&
                 new Date(e.scheduled_time).toLocaleTimeString('en-GB', {
                   hour: '2-digit', minute: '2-digit',
                 }) === t
        )
        if (!alreadyExists) {
          toInsert.push({
            medication_id:  med.id,
            patient_id:     med.patient_id,
            scheduled_time: scheduledTime,
            status:         'pending',
          })
        }
      }
    }
    if (toInsert.length) {
      await supabase.from('medication_alarms').insert(toInsert)
    }
  }, [])

  const fetchMedications = useCallback(async (patientIds) => {
    if (!patientIds.length) return []
    const { data } = await supabase
      .from('patient_medications')
      .select('*')
      .in('patient_id', patientIds)
      .eq('is_active', true)

    const byPatient = {}
    for (const m of (data || [])) {
      if (!byPatient[m.patient_id]) byPatient[m.patient_id] = []
      byPatient[m.patient_id].push(m)
    }
    setMedications(byPatient)
    return data || []
  }, [])

  const fetchPatients = useCallback(async () => {
    if (!user?.id) { setLoading(false); return }

    const filterCol = isProvider ? 'professional_id' : 'client_id'
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq(filterCol, user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[PatientManager] patients fetch error:', error)
      setLoading(false)
      return
    }

    setPatients(data || [])

    if (data?.length) {
      const patientIds = data.map((p) => p.id)
      const meds = await fetchMedications(patientIds)
      if (meds.length) await ensureTodayAlarms(meds)
      await fetchAlarms(patientIds)
    }
    setLoading(false)
  }, [user?.id, isProvider, fetchMedications, ensureTodayAlarms, fetchAlarms])

  // Provider's recent bookings — for linking a patient to a booking/client
  const fetchBookings = useCallback(async () => {
    if (!isProvider || !user?.id) return
    const { data } = await supabase
      .from('bookings')
      .select('id, scheduled_date, client_id, client:profiles!bookings_client_id_fkey(full_name)')
      .eq('provider_id', user.id)
      .in('status', ['confirmed', 'in_progress', 'completed'])
      .order('scheduled_date', { ascending: false })
      .limit(20)
    setBookings(data || [])
  }, [isProvider, user?.id])

  useEffect(() => {
    fetchPatients()
    fetchBookings()
  }, [fetchPatients, fetchBookings])

  // Realtime: refresh alarms whenever medication_alarms changes
  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`patient-mgr-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'medication_alarms',
      }, () => {
        const ids = patients.map((p) => p.id)
        if (ids.length) fetchAlarms(ids)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user?.id, patients, fetchAlarms])

  // Check for due alarms every 30 s (provider only — they administer medications)
  useEffect(() => {
    if (!isProvider) return
    const check = () => {
      const now = new Date()
      Object.values(alarms).flat().forEach((alarm) => {
        if (alarm.status === 'pending' && new Date(alarm.scheduled_time) <= now) {
          const key = alarm.id
          if (!alarmFiredRef.current.has(key)) {
            alarmFiredRef.current.add(key)
            if (soundOn) playBeep()
          }
        }
      })
    }
    check()
    const id = setInterval(check, 30000)
    return () => clearInterval(id)
  }, [alarms, soundOn, isProvider])

  // ── Mutations ─────────────────────────────────────────────────────────────

  async function handleAddPatient() {
    if (!newPatient.name.trim()) return
    setSaving(true)

    // If a booking was selected, pull the client_id from it
    let clientId = null
    if (newPatient.booking_id) {
      const bk = bookings.find((b) => b.id === newPatient.booking_id)
      clientId = bk?.client_id || null
    }

    const { error } = await supabase.from('patients').insert({
      professional_id:    user.id,
      client_id:          clientId,
      booking_id:         newPatient.booking_id || null,
      name:               newPatient.name.trim(),
      date_of_birth:      newPatient.date_of_birth || null,
      medical_conditions: newPatient.medical_conditions.trim() || null,
      observations:       newPatient.observations.trim()       || null,
    })

    setSaving(false)
    if (error) { console.error('[PatientManager] add patient error:', error); return }

    setNewPatient({ name: '', date_of_birth: '', medical_conditions: '', observations: '', booking_id: '' })
    setShowAddPatient(false)
    fetchPatients()
  }

  async function handleRemovePatient(id) {
    await supabase.from('patients').delete().eq('id', id)
    setExpanded(null)
    fetchPatients()
  }

  async function handleAddMed(patientId) {
    if (!newMed.name.trim()) return
    setSaving(true)

    const times = newMed.times.filter((t) => t.trim())
    const { error } = await supabase.from('patient_medications').insert({
      patient_id: patientId,
      name:       newMed.name.trim(),
      dosage:     newMed.dosage.trim()     || null,
      frequency:  newMed.frequency.trim()  || null,
      times:      times.length ? times : null,
    })

    setSaving(false)
    if (error) { console.error('[PatientManager] add medication error:', error); return }

    setNewMed({ name: '', dosage: '', frequency: '', times: ['08:00'] })
    setAddMedFor(null)
    fetchPatients()
  }

  async function handleRemoveMed(medId) {
    await supabase.from('patient_medications').update({ is_active: false }).eq('id', medId)
    fetchPatients()
  }

  async function handleUpdateAlarm(alarmId, status) {
    await supabase.from('medication_alarms').update({
      status,
      administered_at: status === 'administered' ? new Date().toISOString() : null,
    }).eq('id', alarmId)
    const ids = patients.map((p) => p.id)
    fetchAlarms(ids)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-12 text-gray-400 text-sm mb-6">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        A carregar pacientes...
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User2 className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-bold text-gray-900">Gestão de Pacientes</h2>
          {isProvider && (
            <button
              onClick={() => setSoundOn((s) => !s)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title={soundOn ? 'Desativar alarme sonoro' : 'Ativar alarme sonoro'}
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          )}
        </div>

        {isProvider && (
          <button
            onClick={() => setShowAddPatient(!showAddPatient)}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary-600
                       bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Paciente
          </button>
        )}
      </div>

      {/* ── Add patient form ── */}
      {isProvider && showAddPatient && (
        <div className="card border-primary-200 bg-primary-50/40 space-y-3">
          <h3 className="font-bold text-gray-900 text-sm">Adicionar Paciente</h3>

          <div>
            <label className="input-label">Nome *</label>
            <input
              className="input-field"
              placeholder="Nome completo do paciente"
              value={newPatient.name}
              onChange={(e) => setNewPatient((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Data de Nascimento</label>
              <input
                type="date"
                className="input-field"
                value={newPatient.date_of_birth}
                onChange={(e) => setNewPatient((p) => ({ ...p, date_of_birth: e.target.value }))}
              />
            </div>
            <div>
              <label className="input-label">Associar a Reserva (opcional)</label>
              <select
                className="input-field"
                value={newPatient.booking_id}
                onChange={(e) => setNewPatient((p) => ({ ...p, booking_id: e.target.value }))}
              >
                <option value="">Nenhuma</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.client?.full_name || 'Cliente'} — {new Date(b.scheduled_date).toLocaleDateString('pt-PT')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="input-label">Condições médicas</label>
            <textarea
              rows={2}
              className="input-field resize-none text-sm"
              placeholder="Diabetes, hipertensão, alergias..."
              value={newPatient.medical_conditions}
              onChange={(e) => setNewPatient((p) => ({ ...p, medical_conditions: e.target.value }))}
            />
          </div>

          <div>
            <label className="input-label">Observações</label>
            <textarea
              rows={2}
              className="input-field resize-none text-sm"
              placeholder="Notas adicionais, preferências..."
              value={newPatient.observations}
              onChange={(e) => setNewPatient((p) => ({ ...p, observations: e.target.value }))}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowAddPatient(false)
                setNewPatient({ name: '', date_of_birth: '', medical_conditions: '', observations: '', booking_id: '' })
              }}
              className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-semibold
                         text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddPatient}
              disabled={saving || !newPatient.name.trim()}
              className="flex-1 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white
                         text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
            >
              {saving
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : 'Guardar Paciente'}
            </button>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {patients.length === 0 && (
        <div className="card text-center py-10">
          <User2 className="w-10 h-10 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-500 font-medium">
            {isProvider ? 'Nenhum paciente adicionado ainda.' : 'Sem dados de paciente.'}
          </p>
          {isProvider && (
            <p className="text-xs text-gray-400 mt-1">
              Clica em "Novo Paciente" para registar o primeiro paciente.
            </p>
          )}
        </div>
      )}

      {/* ── Patient cards ── */}
      {patients.map((patient) => {
        const meds          = medications[patient.id] || []
        const patientAlarms = alarms[patient.id]      || []
        const now           = new Date()
        const dueAlarms     = patientAlarms.filter(
          (a) => a.status === 'pending' && new Date(a.scheduled_time) <= now
        )
        const isExpanded = expanded === patient.id

        return (
          <div
            key={patient.id}
            className={`card overflow-hidden ${dueAlarms.length > 0 ? 'border-amber-300 bg-amber-50/20' : ''}`}
          >
            {/* Patient header row */}
            <div
              className="flex items-start gap-3 cursor-pointer select-none"
              onClick={() => setExpanded(isExpanded ? null : patient.id)}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <User2 className="w-5 h-5 text-primary-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900">{patient.name}</p>
                  {dueAlarms.length > 0 && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                    </span>
                  )}
                </div>
                {patient.date_of_birth && (
                  <p className="text-xs text-gray-400">
                    Nascimento: {new Date(`${patient.date_of_birth}T00:00`).toLocaleDateString('pt-PT')}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-gray-500">
                    {meds.length} medicamento{meds.length !== 1 ? 's' : ''}
                  </span>
                  {dueAlarms.length > 0 && (
                    <span className="text-xs font-semibold text-amber-600">
                      ⏰ {dueAlarms.length} alarme{dueAlarms.length !== 1 ? 's' : ''} pendente{dueAlarms.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {isProvider && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemovePatient(patient.id) }}
                    className="w-7 h-7 rounded-full text-red-300 hover:bg-red-50 hover:text-red-500
                               flex items-center justify-center transition-colors"
                    title="Remover paciente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {isExpanded
                  ? <ChevronUp   className="w-4 h-4 text-gray-400" />
                  : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-5">

                {/* Medical info */}
                {(patient.medical_conditions || patient.observations) && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-1.5">
                    {patient.medical_conditions && (
                      <p className="text-xs text-blue-800">
                        <span className="font-semibold">Condições médicas: </span>
                        {patient.medical_conditions}
                      </p>
                    )}
                    {patient.observations && (
                      <p className="text-xs text-blue-700">
                        <span className="font-semibold">Observações: </span>
                        {patient.observations}
                      </p>
                    )}
                  </div>
                )}

                {/* Medications */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-primary-500" />
                      <span className="text-sm font-bold text-gray-800">Medicamentos</span>
                    </div>
                    {isProvider && (
                      <button
                        onClick={() => setAddMedFor(addMedFor === patient.id ? null : patient.id)}
                        className="flex items-center gap-1 text-xs font-semibold text-primary-600
                                   hover:text-primary-700 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar
                      </button>
                    )}
                  </div>

                  {/* Add medication inline form */}
                  {isProvider && addMedFor === patient.id && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3 space-y-2">
                      <input
                        className="input-field text-sm"
                        placeholder="Nome do medicamento *"
                        value={newMed.name}
                        onChange={(e) => setNewMed((m) => ({ ...m, name: e.target.value }))}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          className="input-field text-sm"
                          placeholder="Dosagem (ex: 500mg)"
                          value={newMed.dosage}
                          onChange={(e) => setNewMed((m) => ({ ...m, dosage: e.target.value }))}
                        />
                        <input
                          className="input-field text-sm"
                          placeholder="Frequência (ex: 2x ao dia)"
                          value={newMed.frequency}
                          onChange={(e) => setNewMed((m) => ({ ...m, frequency: e.target.value }))}
                        />
                      </div>

                      {/* Time slots */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1.5">Horários de administração:</p>
                        {newMed.times.map((t, i) => (
                          <div key={i} className="flex items-center gap-2 mb-1">
                            <input
                              type="time"
                              className="input-field text-sm flex-1"
                              value={t}
                              onChange={(e) => setNewMed((m) => {
                                const times = [...m.times]
                                times[i] = e.target.value
                                return { ...m, times }
                              })}
                            />
                            {newMed.times.length > 1 && (
                              <button
                                onClick={() => setNewMed((m) => ({
                                  ...m, times: m.times.filter((_, j) => j !== i),
                                }))}
                                className="text-red-300 hover:text-red-500 transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => setNewMed((m) => ({ ...m, times: [...m.times, '12:00'] }))}
                          className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-1"
                        >
                          <Plus className="w-3 h-3" /> Adicionar horário
                        </button>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => {
                            setAddMedFor(null)
                            setNewMed({ name: '', dosage: '', frequency: '', times: ['08:00'] })
                          }}
                          className="flex-1 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold
                                     text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleAddMed(patient.id)}
                          disabled={saving || !newMed.name.trim()}
                          className="flex-1 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white
                                     text-xs font-semibold disabled:opacity-60 transition-colors"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Medications list */}
                  {meds.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Nenhum medicamento registado.</p>
                  ) : (
                    <div className="space-y-2">
                      {meds.map((med) => (
                        <div key={med.id} className="flex items-start gap-2 bg-gray-50 rounded-xl p-2.5">
                          <Pill className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{med.name}</p>
                            {med.dosage    && <p className="text-xs text-gray-500">{med.dosage}</p>}
                            {med.frequency && <p className="text-xs text-gray-400">{med.frequency}</p>}
                            {med.times?.length > 0 && (
                              <p className="text-xs text-primary-600 font-medium mt-0.5">
                                ⏰ {med.times.join(' · ')}
                              </p>
                            )}
                          </div>
                          {isProvider && (
                            <button
                              onClick={() => handleRemoveMed(med.id)}
                              className="text-red-300 hover:text-red-500 flex-shrink-0 transition-colors"
                              title="Remover medicamento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Today's alarm schedule */}
                {patientAlarms.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Bell className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-bold text-gray-800">Alarmes de Hoje</span>
                    </div>
                    <div className="space-y-1.5">
                      {patientAlarms
                        .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time))
                        .map((alarm) => {
                          const med     = meds.find((m) => m.id === alarm.medication_id)
                          const alarmDt = new Date(alarm.scheduled_time)
                          const timeStr = alarmDt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
                          const isDue   = alarm.status === 'pending' && alarmDt <= now

                          return (
                            <div
                              key={alarm.id}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm
                                ${alarm.status === 'administered' ? 'bg-emerald-50 border-emerald-100'
                                  : alarm.status === 'missed'     ? 'bg-red-50 border-red-100'
                                  : isDue                         ? 'bg-amber-50 border-amber-200'
                                  :                                 'bg-white border-gray-100'}`}
                            >
                              {isDue && (
                                <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                                </span>
                              )}

                              <span className="font-bold text-gray-700 w-12 flex-shrink-0 text-xs">{timeStr}</span>

                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 truncate text-xs">
                                  {med?.name || 'Medicamento'}
                                </p>
                                {med?.dosage && <p className="text-xs text-gray-400">{med.dosage}</p>}
                              </div>

                              {/* Provider action buttons — only on pending alarms */}
                              {isProvider && alarm.status === 'pending' && (
                                <div className="flex gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => handleUpdateAlarm(alarm.id, 'administered')}
                                    className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600
                                               hover:bg-emerald-200 flex items-center justify-center transition-colors"
                                    title="Marcar como administrado"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleUpdateAlarm(alarm.id, 'missed')}
                                    className="w-7 h-7 rounded-full bg-red-100 text-red-500
                                               hover:bg-red-200 flex items-center justify-center transition-colors"
                                    title="Não administrado"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </div>
                              )}

                              {alarm.status === 'administered' && (
                                <span className="text-xs font-semibold text-emerald-600 flex-shrink-0">
                                  ✅ Administrado
                                </span>
                              )}
                              {alarm.status === 'missed' && (
                                <span className="text-xs font-semibold text-red-500 flex-shrink-0">
                                  ❌ Não administrado
                                </span>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
