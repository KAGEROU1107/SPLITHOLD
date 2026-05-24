import { cookies } from 'next/headers'
import { verifyToken } from './auth'
import { SESSION_COOKIE_NAME } from './session-cookie'

export type SessionUser = {
  id: string
  name: string
  email: string
  avatarUrl: string | null
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  return {
    id: payload.userId,
    name: payload.name,
    email: payload.email,
    avatarUrl: payload.avatarUrl,
  }
}
