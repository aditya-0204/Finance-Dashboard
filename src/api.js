const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

export async function apiRequest(
  path,
  { method = 'GET', token, body, params } = {},
) {
  const url = new URL(`${API_BASE}${path}`)

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }

  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(payload.error ?? 'Request failed.')
    error.status = response.status
    error.details = payload.details ?? null
    throw error
  }

  return payload
}
