import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { decodeToken, revokeToken } from '@/lib/auth'
import { validateCsrfHeader } from '@/lib/csrf'
import { clearSessionCookie, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/session-cookie'

export async function POST(request: NextRequest) {
  const csrfError = validateCsrfHeader(request)
  if (csrfError) return csrfError

  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (token) {
    const payload = await decodeToken(token)
    if (payload?.jti) {
      const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)
      await revokeToken(payload.jti, expiresAt)
    }
  }

  const response = NextResponse.json({ success: true })
  clearSessionCookie(response)
  response.cookies.delete('csrf_token')
  return response
}
