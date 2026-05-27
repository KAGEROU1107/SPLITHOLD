const CSRF_COOKIE = 'csrf_token'
const CSRF_HEADER = 'x-csrf-token'
const CSRF_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

export function getCsrfToken(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}

export function csrfFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? 'GET').toUpperCase()
  if (!CSRF_METHODS.has(method)) return fetch(input, init)
  const token = getCsrfToken()
  if (!token) return fetch(input, init)
  const headers = new Headers(init?.headers)
  headers.set(CSRF_HEADER, token)
  return fetch(input, { ...init, headers })
}
