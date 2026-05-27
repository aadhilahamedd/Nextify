const STORAGE_KEY = 'nextifyContactMessages'

export function saveLocalContactMessage(data) {
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  const entry = {
    _id: `local_${Date.now()}`,
    name: data.name,
    email: data.email,
    phone: data.phone || '',
    subject: data.subject,
    message: data.message,
    status: 'new',
    createdAt: new Date().toISOString(),
  }
  existing.unshift(entry)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
  return entry
}

export function getLocalContactMessages() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function removeLocalContactMessage(id) {
  const existing = getLocalContactMessages().filter((item) => item._id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
}

export function markLocalContactMessageRead(id) {
  const existing = getLocalContactMessages().map((item) =>
    item._id === id ? { ...item, status: 'read' } : item
  )
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
}
