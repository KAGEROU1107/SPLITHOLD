import { NextRequest, NextResponse } from 'next/server'

const CSRF_HEADER = 'x-csrf-token'
const CSRF_COOKIE = 'csrf_token'

export function validateCsrfHeader(request: NextRequest): NextResponse | null {
  const headerToken = request.headers.get(CSRF_HEADER)
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }
  return null
}

export function setCsrfCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'strict',
    path: '/',
  })
}
