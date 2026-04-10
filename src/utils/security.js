// Basic security helpers
export function sanitizeInput(str) {
  return String(str).replace(/[<>"'`]/g, '')
}

export function isValidEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
}
