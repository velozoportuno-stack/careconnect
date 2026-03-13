import { useState, useEffect } from 'react'
import { Pencil, X, Save, Loader2, Briefcase, CheckCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/appStore'
import { formatCurrency } from '../../utils/formatters'
import {
  SERVICE_TYPES, SERVICE_TYPE_LABELS,
  LICENSE_REQUIRED, getLicenseLabel,
} from '../../utils/constants'

function categoryIcon(category) {
  return SERVICE_TYPES.find((s) => s.value === category)?.icon || '🔧'
}

const EMPTY_SLOT = {
  category: '', price_per_hour: '', daily_rate: '',
  description: '', nursing_license: '', nursing_license_country: 'PT',
}

/* ── Slot edit modal ── */
function SlotModal({ slot, slotNumber, profCountry, onSave, onClose }) {
  const initCountry = slot?.nursing_license_country || profCountry || 'PT'
  const [form, setForm] = useState(
    slot?.category
      ? { ...slot, nursing_license: slot.nursing_license || '', nursing_license_country: initCountry }
      : { ...EMPTY_SLOT, nursing_license_country: initCountry }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const needsLicense = LICENSE_REQUIRED.has(form.category)

  async function handleSave() {
    if (!form.category) { setError('Seleciona a profissão.'); return }
    if (!form.price_per_hour || parseFloat(form.price_per_hour) <= 0) {
      setError('Preço por hora obrigatório.'); return
    }
    if (needsLicense && !form.nursing_license?.trim()) {
      setError('Número de licença obrigatório para esta profissão.'); return
    }
    setSaving(true)
    setError(null)
    await onSave(slotNumber, {
      category:                form.category,
      title:                   SERVICE_TYPE_LABELS[form.category] || 'Serviço',
      price_per_hour:          parseFloat(form.price_per_hour),
      daily_rate:              form.daily_rate ? parseFloat(form.daily_rate) : null,
      description:             form.description || null,
      nursing_license:         needsLicense ? (form.nursing_license?.trim() || null) : null,
      nursing_license_country: needsLicense ? (form.nursing_license_country || 'PT') : null,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="font-bold text-gray-900">📋 Perfil {slotNumber}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
          )}

          <div>
            <label className="input-label">Profissão / Tipo de serviço *</label>
            <select
              className="input-field"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              <option value="" disabled>Seleciona a profissão...</option>
              <optgroup label="── Saúde e Cuidado ──">
                {SERVICE_TYPES.filter((t) => t.group === 'health').map((t) => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </optgroup>
              <optgroup label="── Serviços Gerais ──">
                {SERVICE_TYPES.filter((t) => t.group === 'general' && t.value !== 'other').map((t) => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">⏱ Preço/hora *</label>
              <input
                type="number" step="0.50" min="1" className="input-field" placeholder="15.00"
                value={form.price_per_hour}
                onChange={(e) => setForm((f) => ({ ...f, price_per_hour: e.target.value }))}
              />
            </div>
            <div>
              <label className="input-label">📅 Preço/dia</label>
              <input
                type="number" step="1" min="1" className="input-field" placeholder="80"
                value={form.daily_rate || ''}
                onChange={(e) => setForm((f) => ({ ...f, daily_rate: e.target.value }))}
              />
            </div>
          </div>

          {needsLicense && (
            <div className="space-y-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <div>
                <label className="input-label">
                  {getLicenseLabel(form.nursing_license_country, form.category)} *
                </label>
                <input
                  type="text" className="input-field"
                  placeholder={form.nursing_license_country === 'BR' ? 'Ex: COREN-SP 123456' : 'Ex: 7-E-123456'}
                  value={form.nursing_license}
                  onChange={(e) => setForm((f) => ({ ...f, nursing_license: e.target.value }))}
                />
              </div>
              <div>
                <label className="input-label">País da licença</label>
                <select
                  className="input-field"
                  value={form.nursing_license_country}
                  onChange={(e) => setForm((f) => ({ ...f, nursing_license_country: e.target.value }))}
                >
                  <option value="PT">🇵🇹 Portugal</option>
                  <option value="BR">🇧🇷 Brasil</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="input-label">Descrição do serviço</label>
            <textarea
              rows={3} className="input-field resize-none text-sm"
              placeholder="O que inclui este serviço?"
              value={form.description || ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 btn-primary py-3 text-sm disabled:opacity-60"
          >
            {saving
              ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              : <><Save className="w-4 h-4" /> Guardar Perfil {slotNumber}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ServiceManager() {
  const { user } = useAppStore()
  const [slots, setSlots]           = useState([null, null]) // [slot1, slot2]
  const [loading, setLoading]       = useState(true)
  const [profCountry, setProfCountry] = useState('PT')
  const [editingSlot, setEditingSlot] = useState(null) // 1 or 2
  const [successMsg, setSuccessMsg] = useState(null)

  useEffect(() => { fetchSlots() }, [])

  async function fetchSlots() {
    setLoading(true)
    const [{ data: s1 }, { data: s2 }, { data: prof }] = await Promise.all([
      supabase.from('provider_services').select('*').eq('provider_id', user.id).eq('slot', 1).maybeSingle(),
      supabase.from('provider_services').select('*').eq('provider_id', user.id).eq('slot', 2).maybeSingle(),
      supabase.from('profiles').select('country').eq('id', user.id).single(),
    ])
    setSlots([s1 || null, s2 || null])
    if (prof?.country) setProfCountry(prof.country)
    setLoading(false)
  }

  async function handleSaveSlot(slotNumber, form) {
    const { error } = await supabase
      .from('provider_services')
      .upsert(
        { provider_id: user.id, slot: slotNumber, is_available: true, ...form },
        { onConflict: 'provider_id,slot' }
      )
    if (error) {
      console.error('[ServiceManager] upsert error:', error)
      return
    }
    setEditingSlot(null)
    setSuccessMsg(`Perfil ${slotNumber} guardado com sucesso.`)
    setTimeout(() => setSuccessMsg(null), 3500)
    fetchSlots()
  }

  if (loading) return <div className="card animate-pulse h-28 mb-6" />

  return (
    <div className="card mb-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <Briefcase className="w-5 h-5 text-primary-600" />
        <h2 className="text-lg font-bold text-gray-900">Os meus serviços</h2>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
          <CheckCheck className="w-4 h-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* 2 slot boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2].map((slotNum) => {
          const svc = slots[slotNum - 1]
          return (
            <div
              key={slotNum}
              className={`rounded-2xl border-2 p-4 flex flex-col gap-3
                          ${svc ? 'border-primary-200 bg-primary-50/40' : 'border-dashed border-gray-200 bg-gray-50'}`}
            >
              {/* Slot header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Perfil {slotNum}
                </span>
                <button
                  onClick={() => setEditingSlot(slotNum)}
                  className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-800 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Editar
                </button>
              </div>

              {svc ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{categoryIcon(svc.category)}</span>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm leading-tight">
                        {SERVICE_TYPE_LABELS[svc.category] || svc.title || 'Serviço'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {svc.price_per_hour ? (
                          <span className="text-xs font-medium text-primary-600">
                            {formatCurrency(svc.price_per_hour)}/h
                          </span>
                        ) : null}
                        {svc.daily_rate ? (
                          <span className="text-xs font-medium text-primary-500">
                            {formatCurrency(svc.daily_rate)}/dia
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  {svc.nursing_license && (
                    <p className="text-xs text-blue-600 font-medium">
                      Lic: {svc.nursing_license}
                    </p>
                  )}
                  {svc.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">{svc.description}</p>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 gap-2">
                  <p className="text-sm text-gray-400 font-medium">Não configurado</p>
                  <button
                    onClick={() => setEditingSlot(slotNum)}
                    className="text-xs text-primary-600 font-semibold hover:underline"
                  >
                    + Configurar
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Edit modal */}
      {editingSlot !== null && (
        <SlotModal
          slot={slots[editingSlot - 1]}
          slotNumber={editingSlot}
          profCountry={profCountry}
          onSave={handleSaveSlot}
          onClose={() => setEditingSlot(null)}
        />
      )}
    </div>
  )
}
