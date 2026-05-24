import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/session-cookie'

export async function POST() {
  const response = NextResponse.json({ success: true })
  clearSessionCookie(response)
  return response
}
