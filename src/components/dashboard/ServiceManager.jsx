import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Save, Loader2, Briefcase, AlertTriangle, CheckCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/appStore'
import { formatCurrency } from '../../utils/formatters'
import { SERVICE_TYPES, SERVICE_TYPE_LABELS } from '../../utils/constants'

function categoryIcon(category) {
  return SERVICE_TYPES.find((s) => s.value === category)?.icon || '🔧'
}

function emptyService() {
  return { category: '', title: '', description: '', bio: '', price_per_hour: '', daily_rate: '' }
}

/* ── Add / Edit modal ── */
function ServiceModal({ service, onSave, onClose }) {
  const [form, setForm]     = useState(service || emptyService())
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  function handleCategoryChange(val) {
    const label = SERVICE_TYPE_LABELS[val] || ''
    setForm((f) => ({ ...f, category: val, title: f.title || label }))
  }

  async function handleSave() {
    if (!form.category) { setError('Seleciona a profissão.'); return }
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
          <h2 className="font-bold text-gray-900">{isEdit ? 'Editar Serviço' : 'Novo Serviço'}</h2>
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

          <div>
            <label className="input-label">Título do serviço</label>
            <input
              className="input-field"
              placeholder={SERVICE_TYPE_LABELS[form.category] || 'Ex: Cuidados domiciliários'}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">⏱ Preço/hora (€) *</label>
              <input
                type="number" step="0.50" min="1" className="input-field" placeholder="15.00"
                value={form.price_per_hour}
                onChange={(e) => setForm((f) => ({ ...f, price_per_hour: e.target.value }))}
              />
            </div>
            <div>
              <label className="input-label">📅 Preço/dia (€)</label>
              <input
                type="number" step="1" min="1" className="input-field" placeholder="80"
                value={form.daily_rate}
                onChange={(e) => setForm((f) => ({ ...f, daily_rate: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="input-label">Bio / Experiência</label>
            <textarea
              rows={3} className="input-field resize-none text-sm"
              placeholder="Experiência, certificações, especialidade..."
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            />
          </div>

          <div>
            <label className="input-label">Descrição do serviço</label>
            <textarea
              rows={2} className="input-field resize-none text-sm"
              placeholder="O que inclui este serviço?"
              value={form.description}
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
              : <><Save className="w-4 h-4" /> {isEdit ? 'Guardar' : 'Criar serviço'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Delete confirmation modal ── */
function DeleteModal({ service, onCancel, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Apagar serviço</h3>
            <p className="text-sm text-gray-500 mt-1">
              Tens a certeza que queres apagar este serviço?
            </p>
          </div>
        </div>

        {service && (
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm">
            <p className="font-semibold text-gray-800">
              {categoryIcon(service.category)} {SERVICE_TYPE_LABELS[service.category] || service.title}
            </p>
            {service.price_per_hour && (
              <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(service.price_per_hour)}/h</p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <><Trash2 className="w-4 h-4" /> Apagar</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ServiceManager() {
  const { user } = useAppStore()
  const [services, setServices]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [modalData, setModalData]     = useState(null)   // null | {} (new) | svc (edit)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [successMsg, setSuccessMsg]   = useState(null)

  useEffect(() => { fetchServices() }, [])

  async function fetchServices() {
    setLoading(true)
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

    // No services yet — auto-create from profile data so the tab isn't empty
    // after registration. daily_rate intentionally omitted (added in migration 005;
    // user can set it via the edit modal).
    const { data: profile } = await supabase
      .from('profiles')
      .select('service_type, hourly_rate, bio')
      .eq('id', user.id)
      .single()

    if (profile?.service_type) {
      const title = SERVICE_TYPE_LABELS[profile.service_type] || 'Serviço'
      const { data: created, error: insertErr } = await supabase
        .from('provider_services')
        .insert({
          provider_id:    user.id,
          category:       profile.service_type,
          title,
          price_per_hour: profile.hourly_rate ? parseFloat(profile.hourly_rate) : null,
          bio:            profile.bio || null,
          is_available:   true,
        })
        .select()
      if (insertErr) console.error('[ServiceManager] auto-create error:', insertErr)
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

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    await supabase.from('provider_services').delete().eq('id', deleteTarget.id)
    setServices((prev) => prev.filter((s) => s.id !== deleteTarget.id))
    setDeleteTarget(null)
    setDeleteLoading(false)
    setSuccessMsg('Serviço apagado com sucesso.')
    setTimeout(() => setSuccessMsg(null), 3500)
  }

  if (loading) return <div className="card animate-pulse h-28 mb-6" />

  return (
    <div className="card mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-bold text-gray-900">
            Os meus serviços
            <span className="ml-1.5 text-base font-normal text-gray-400">({services.length})</span>
          </h2>
        </div>
        <button
          onClick={() => setModalData(emptyService())}
          className="btn-primary text-sm py-2 px-4"
        >
          <Plus className="w-4 h-4" />
          Adicionar serviço
        </button>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
          <CheckCheck className="w-4 h-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Empty state */}
      {services.length === 0 ? (
        <div className="text-center py-10">
          <Briefcase className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Ainda não tens serviços registados.</p>
          <p className="text-sm text-gray-400 mt-1">Adiciona o teu primeiro serviço!</p>
          <button
            onClick={() => setModalData(emptyService())}
            className="btn-primary text-sm py-2 px-5 mt-4"
          >
            <Plus className="w-4 h-4" />
            Adicionar primeiro serviço
          </button>
        </div>
      ) : (
        /* Ordered list */
        <ol className="divide-y divide-gray-100">
          {services.map((svc, i) => (
            <li key={svc.id} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
              {/* Order number */}
              <span className="w-6 text-center text-xs font-bold text-gray-300 flex-shrink-0">
                {i + 1}
              </span>

              {/* Icon */}
              <span className="text-xl flex-shrink-0">{categoryIcon(svc.category)}</span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 leading-tight">
                  {SERVICE_TYPE_LABELS[svc.category] || svc.title || 'Serviço'}
                </p>
                <div className="flex items-center gap-2.5 flex-wrap mt-0.5">
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
                  {svc.created_at && (
                    <span className="text-xs text-gray-400">
                      {new Date(svc.created_at).toLocaleDateString('pt-PT', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                      })}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setModalData(svc)}
                  title="Editar"
                  className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500
                             flex items-center justify-center transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteTarget(svc)}
                  title="Apagar"
                  className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500
                             flex items-center justify-center transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {/* Add / Edit modal */}
      {modalData !== null && (
        <ServiceModal
          service={modalData.id ? modalData : null}
          onSave={handleSave}
          onClose={() => setModalData(null)}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteModal
          service={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          loading={deleteLoading}
        />
      )}
    </div>
  )
}
