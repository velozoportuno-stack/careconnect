// All professional service types
export const SERVICE_TYPES = [
  // Health & Care
  { value: 'nurse',            label: 'Enfermeiro(a)',              icon: '🩺', group: 'health' },
  { value: 'auxiliary_nurse',  label: 'Auxiliar de Enfermagem',     icon: '💉', group: 'health' },
  { value: 'caregiver',        label: 'Cuidador(a) de Idosos',      icon: '🧓', group: 'health' },
  { value: 'physiotherapist',  label: 'Fisioterapeuta',             icon: '🦾', group: 'health' },
  { value: 'psychologist',     label: 'Psicólogo(a)',               icon: '🧠', group: 'health' },
  { value: 'nutritionist',     label: 'Nutricionista',              icon: '🥗', group: 'health' },
  { value: 'personal_trainer', label: 'Personal Trainer',           icon: '🏋️', group: 'health' },
  // General Services
  { value: 'plumber',          label: 'Encanador',                  icon: '🔧', group: 'general' },
  { value: 'electrician',      label: 'Eletricista',                icon: '⚡', group: 'general' },
  { value: 'mason',            label: 'Pedreiro',                   icon: '🧱', group: 'general' },
  { value: 'painter',          label: 'Pintor',                     icon: '🎨', group: 'general' },
  { value: 'carpenter',        label: 'Carpinteiro',                icon: '🪚', group: 'general' },
  { value: 'locksmith',        label: 'Serralheiro',                icon: '🔐', group: 'general' },
  { value: 'gardener',         label: 'Jardineiro',                 icon: '🌿', group: 'general' },
  { value: 'driver',           label: 'Motorista',                  icon: '🚗', group: 'general' },
  { value: 'security',         label: 'Segurança',                  icon: '👮', group: 'general' },
  { value: 'waiter',           label: 'Atendente de Mesa',          icon: '🍽️', group: 'general' },
  { value: 'cook',             label: 'Cozinheiro(a)',              icon: '👨‍🍳', group: 'general' },
  { value: 'babysitter',       label: 'Babá',                       icon: '👶', group: 'general' },
  { value: 'cleaner',          label: 'Diarista',                   icon: '🧹', group: 'general' },
  { value: 'admin_assistant',  label: 'Assistente Administrativo',  icon: '📋', group: 'general' },
  { value: 'translator',       label: 'Tradutor(a)',                icon: '🌐', group: 'general' },
  { value: 'photographer',     label: 'Fotógrafo(a)',               icon: '📷', group: 'general' },
  { value: 'other',            label: 'Outro',                      icon: '✏️', group: 'general' },
]

// Map value → label for quick lookup
export const SERVICE_TYPE_LABELS = Object.fromEntries(
  SERVICE_TYPES.map((t) => [t.value, t.label])
)

// Professions that require a license number
export const LICENSE_REQUIRED = new Set([
  'nurse', 'auxiliary_nurse', 'caregiver', 'physiotherapist', 'psychologist', 'nutritionist',
])

// License label by country and profession
export function getLicenseLabel(country, serviceType) {
  if (country === 'BR') {
    if (serviceType === 'psychologist')    return 'Número do CRP (Conselho Regional de Psicologia)'
    if (serviceType === 'nutritionist')    return 'Número do CRN (Conselho Regional de Nutrição)'
    if (serviceType === 'physiotherapist') return 'Número do CREFITO'
    return 'Número do COREN/CRP/CRN/CREFITO'
  }
  return 'Número da Cédula Profissional (Ordem dos Enfermeiros / Associação de Saúde)'
}

export const CLEANING_TYPES = [
  { value: 'simples',     label: 'Limpeza simples' },
  { value: 'pesada',      label: 'Limpeza pesada' },
  { value: 'apartamento', label: 'Limpeza de apartamento' },
  { value: 'residencia',  label: 'Limpeza de residência/moradia' },
  { value: 'pos_obra',    label: 'Limpeza pós-obra' },
  { value: 'escritorio',  label: 'Limpeza de escritório' },
]

export const CLEANING_TYPE_LABELS = Object.fromEntries(
  CLEANING_TYPES.map((t) => [t.value, t.label])
)
