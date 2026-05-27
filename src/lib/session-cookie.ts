import type { NextResponse } from 'next/server'

export const SESSION_COOKIE_NAME = 'splithold_token'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'strict',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  })
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.delete(SESSION_COOKIE_NAME)
}
