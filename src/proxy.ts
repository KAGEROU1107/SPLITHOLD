import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { SESSION_COOKIE_NAME } from '@/lib/session-cookie'

const AUTH_PATHS = ['/login', '/register']
const PROTECTED_PREFIXES = ['/dashboard', '/bills', '/profile']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value

  const isAuthPath = AUTH_PATHS.some(p => pathname === p)
  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p))

  if (isAuthPath && token) {
    const payload = await verifyToken(token)
    if (payload) return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (isProtected) {
    if (!token) return NextResponse.redirect(new URL('/login', request.url))
    const payload = await verifyToken(token)
    if (!payload) {
      const res = NextResponse.redirect(new URL('/login', request.url))
      res.cookies.delete(SESSION_COOKIE_NAME)
      return res
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
