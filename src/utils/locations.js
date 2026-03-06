// Localizações disponíveis no CareConnect
export const COUNTRIES = [
  { value: 'PT', label: '🇵🇹 Portugal' },
  { value: 'BR', label: '🇧🇷 Brasil' },
]

export const CITIES = {
  PT: [
    'Viana do Castelo', 'Braga', 'Guimarães', 'Porto', 'Aveiro',
    'Coimbra', 'Leiria', 'Lisboa', 'Setúbal', 'Évora',
    'Faro', 'Viseu', 'Funchal',
  ],
  BR: [
    'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Salvador', 'Fortaleza',
    'Curitiba', 'Manaus', 'Recife', 'Porto Alegre', 'Belém',
    'Goiânia', 'Florianópolis', 'Natal', 'Maceió',
  ],
}

/** Devolve a label do país a partir do código (ex: 'PT' → '🇵🇹 Portugal') */
export function countryLabel(code) {
  return COUNTRIES.find((c) => c.value === code)?.label ?? code
}
