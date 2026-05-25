import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { SESSION_COOKIE_NAME } from '@/lib/session-cookie'

const AUTH_PATHS = ['/login', '/register', '/forgot-password']
const PROTECTED_PREFIXES = ['/dashboard', '/bills', '/profile', '/admin']

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

    // Admin-only guard
    if (pathname.startsWith('/admin') && payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Force password change: redirect to profile except when already on profile
    if (payload.mustChangePassword && !pathname.startsWith('/profile')) {
      return NextResponse.redirect(new URL('/profile?force=1', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|join|pay).*)'],
}
