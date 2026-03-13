import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Save, ToggleLeft, ToggleRight, Loader2, Briefcase } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/appStore'
import { formatCurrency } from '../../utils/formatters'
import { SERVICE_TYPES, SERVICE_TYPE_LABELS } from '../../utils/constants'

// Badge colour by service group
function badgeColor(category) {
  const t = SERVICE_TYPES.find((s) => s.value === category)
  if (!t) return 'badge-gray'
  if (t.group === 'health') return 'badge-blue'
  if (category === 'cleaner') return 'badge-teal'
  return 'badge-gray'
}

function categoryIcon(category) {
  return SERVICE_TYPES.find((s) => s.value === category)?.icon || '🔧'
}

function emptyService() {
  return { category: '', title: '', description: '', bio: '', price_per_hour: '', daily_rate: '' }
}

function ServiceModal({ service, onSave, onClose }) {
  const [form, setForm]     = useState(service || emptyService())
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  function handleCategoryChange(val) {
    const label = SERVICE_TYPE_LABELS[val] || ''
    setForm((f) => ({ ...f, category: val, title: f.title || label }))
  }

  async function handleSave() {
    if (!form.category)      { setError('Seleciona a profissão.'); return }
    if (!form.price_per_hour || parseFloat(form.price_per_hour) <= 0) {
      setError('Preço por hora obrigatório.')
      return
    }
    setSaving(true)
    setError(null)
    await onSave({
      ...form,
      price_per_hour: parseFloat(form.price_per_hour),
      daily_rate:     form.daily_rate ? parseFloat(form.daily_rate) : null,
      title:          form.title || SERVICE_TYPE_LABELS[form.category] || 'Serviço',
    })
    setSaving(false)
  }

  const isEdit = !!service?.id

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="font-bold text-gray-900">
            {isEdit ? 'Editar Serviço' : 'Novo Serviço'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          {/* Profession / category — full dropdown matching registration */}
          <div>
            <label className="input-label">Profissão / Tipo de serviço *</label>
            <select
              className="input-field"
              value={form.category}
              onChange={(e) => handleCategoryChange(e.target.value)}
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

          {/* Title */}
          <div>
            <label className="input-label">Título do serviço *</label>
            <input
              className="input-field"
              placeholder={SERVICE_TYPE_LABELS[form.category] || 'Ex: Cuidados domiciliários'}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          {/* Rates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">⏱ Preço/hora (€) *</label>
              <input
                type="number"
                step="0.50"
                min="1"
                className="input-field"
                placeholder="15.00"
                value={form.price_per_hour}
                onChange={(e) => setForm((f) => ({ ...f, price_per_hour: e.target.value }))}
              />
            </div>
            <div>
              <label className="input-label">📅 Preço/dia (€)</label>
              <input
                type="number"
                step="1"
                min="1"
                className="input-field"
                placeholder="80"
                value={form.daily_rate}
                onChange={(e) => setForm((f) => ({ ...f, daily_rate: e.target.value }))}
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="input-label">Bio / Experiência</label>
            <textarea
              rows={3}
              className="input-field resize-none text-sm"
              placeholder="Experiência, certificações, especialidade..."
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            />
          </div>

          {/* Description */}
          <div>
            <label className="input-label">Descrição do serviço</label>
            <textarea
              rows={2}
              className="input-field resize-none text-sm"
              placeholder="O que inclui este serviço?"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl text-sm
                       hover:bg-gray-200 transition-colors"
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
              : <><Save className="w-4 h-4" /> {isEdit ? 'Guardar' : 'Criar serviço'}</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ServiceManager() {
  const { user } = useAppStore()
  const [services, setServices]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [modalData, setModalData] = useState(null)
  const [deleting, setDeleting]   = useState(null)

  useEffect(() => { fetchServices() }, [])

  async function fetchServices() {
    const { data, error } = await supabase
      .from('provider_services')
      .select('*')
      .eq('provider_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[ServiceManager] fetch error:', error)
      setServices([])
      setLoading(false)
      return
    }

    if (data?.length > 0) {
      setServices(data)
      setLoading(false)
      return
    }

    // No services yet — check profile and auto-create the first row
    const { data: profile } = await supabase
      .from('profiles')
      .select('service_type, hourly_rate, daily_rate, bio')
      .eq('id', user.id)
      .single()

    if (profile?.service_type) {
      const title = SERVICE_TYPE_LABELS[profile.service_type] || 'Serviço'
      const { data: created } = await supabase
        .from('provider_services')
        .insert({
          provider_id:   user.id,
          category:      profile.service_type,
          title,
          price_per_hour: profile.hourly_rate ? parseFloat(profile.hourly_rate) : null,
          daily_rate:    profile.daily_rate   ? parseFloat(profile.daily_rate)  : null,
          bio:           profile.bio || null,
          is_available:  true,
        })
        .select()
      setServices(created || [])
    } else {
      setServices([])
    }
    setLoading(false)
  }

  async function handleSave(form) {
    if (form.id) {
      await supabase.from('provider_services').update(form).eq('id', form.id)
    } else {
      await supabase.from('provider_services').insert({ ...form, provider_id: user.id })
    }
    setModalData(null)
    fetchServices()
  }

  async function toggleAvailability(svc) {
    await supabase
      .from('provider_services')
      .update({ is_available: !svc.is_available })
      .eq('id', svc.id)
    setServices((prev) =>
      prev.map((s) => s.id === svc.id ? { ...s, is_available: !s.is_available } : s)
    )
  }

  async function handleDelete(id) {
    setDeleting(id)
    await supabase.from('provider_services').delete().eq('id', id)
    setServices((prev) => prev.filter((s) => s.id !== id))
    setDeleting(null)
  }

  if (loading) return <div className="card animate-pulse h-32 mb-6" />

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-bold text-gray-900">Os meus serviços</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {services.length}
          </span>
        </div>
        <button
          onClick={() => setModalData(emptyService())}
          className="btn-primary text-sm py-2 px-4"
        >
          <Plus className="w-4 h-4" />
          Adicionar serviço
        </button>
      </div>

      {services.length === 0 ? (
        <div className="text-center py-10">
          <Briefcase className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Ainda não tens serviços registados.</p>
          <p className="text-sm text-gray-400 mt-1">
            Adiciona o teu primeiro serviço!
          </p>
          <button
            onClick={() => setModalData(emptyService())}
            className="btn-primary text-sm py-2 px-5 mt-4"
          >
            <Plus className="w-4 h-4" />
            Adicionar primeiro serviço
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {services.map((svc) => (
            <div
              key={svc.id}
              className={`border-2 rounded-2xl p-4 transition-all
                          ${svc.is_available ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{categoryIcon(svc.category)}</span>
                  <div>
                    <p className="font-bold text-gray-900 text-sm leading-tight">{svc.title}</p>
                    <span className={`${badgeColor(svc.category)} text-xs mt-0.5`}>
                      {SERVICE_TYPE_LABELS[svc.category] || svc.category || 'Serviço'}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-extrabold text-primary-600">
                    {formatCurrency(svc.price_per_hour)}<span className="text-xs text-gray-400 font-normal">/h</span>
                  </p>
                  {svc.daily_rate && (
                    <p className="text-sm font-semibold text-primary-500">
                      {formatCurrency(svc.daily_rate)}<span className="text-xs text-gray-400 font-normal">/dia</span>
                    </p>
                  )}
                </div>
              </div>

              {svc.bio && (
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{svc.bio}</p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <button
                  onClick={() => toggleAvailability(svc)}
                  className={`flex items-center gap-1.5 text-xs font-semibold transition-colors
                              ${svc.is_available ? 'text-emerald-600' : 'text-gray-400'}`}
                >
                  {svc.is_available
                    ? <ToggleRight className="w-5 h-5" />
                    : <ToggleLeft className="w-5 h-5" />
                  }
                  {svc.is_available ? 'Disponível' : 'Indisponível'}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setModalData(svc)}
                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600
                               flex items-center justify-center transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(svc.id)}
                    disabled={deleting === svc.id}
                    className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500
                               flex items-center justify-center transition-colors disabled:opacity-50"
                    title="Eliminar"
                  >
                    {deleting === svc.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />
                    }
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalData !== null && (
        <ServiceModal
          service={modalData.id ? modalData : null}
          onSave={handleSave}
          onClose={() => setModalData(null)}
        />
      )}
    </div>
  )
}
