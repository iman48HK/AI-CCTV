const API_BASE = '/api'

function getToken() {
  return localStorage.getItem('authToken')
}

export async function api(url, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (res.status === 401) {
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
    window.dispatchEvent(new CustomEvent('auth:session-expired'))
  }

  return res
}

export const ROLES = {
  system_admin: 'System Admin',
  department_admin: 'Department Admin',
  doctor: 'Doctor',
  nurse: 'Nurse',
  worker: 'Worker',
  other: 'Other',
}

export function roleLabel(role, roleOptions = []) {
  const fromBuiltIn = ROLES[role]
  if (fromBuiltIn) return fromBuiltIn
  const fromDynamic = roleOptions.find((r) => r.key === role)
  return fromDynamic?.label || role
}
