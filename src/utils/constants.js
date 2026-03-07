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
