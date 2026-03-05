export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email) || 'Email inválido'
}

export const validatePhone = (phone) => {
  const re = /^(\+351|00351)?[0-9]{9}$/
  return re.test(phone.replace(/\s/g, '')) || 'Telefone inválido'
}

export const validatePassword = (password) => {
  if (password.length < 8) return 'A senha deve ter no mínimo 8 caracteres'
  if (!/[A-Z]/.test(password)) return 'A senha deve conter ao menos uma letra maiúscula'
  if (!/[0-9]/.test(password)) return 'A senha deve conter ao menos um número'
  return true
}

export const validateRequired = (value) => {
  return (value && value.toString().trim().length > 0) || 'Campo obrigatório'
}
