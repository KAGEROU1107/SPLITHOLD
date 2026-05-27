import { randomUUID } from 'crypto'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from './supabase'

export interface JwtPayload {
  userId: string
  name: string
  email: string
  avatarUrl: string | null
  role: string
  mustChangePassword: boolean
  jti: string
}

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET environment variable is not set')
  return new TextEncoder().encode(s)
}

export async function signToken(payload: Omit<JwtPayload, 'jti'>): Promise<string> {
  const jti = randomUUID()
  return new SignJWT({ ...payload, jti })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    const jwtPayload = payload as unknown as JwtPayload

    // Fail closed: if denylist check fails for any reason, reject the token
    try {
      const { data } = await supabaseAdmin
        .from('jwt_denylist')
        .select('jti')
        .eq('jti', jwtPayload.jti)
        .maybeSingle()
      if (data) return null
    } catch {
      return null
    }

    return jwtPayload
  } catch {
    return null
  }
}

// Verifies JWT signature/expiry only — no denylist check. Use for logout flow.
export async function decodeToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as JwtPayload
  } catch {
    return null
  }
}

export async function revokeToken(jti: string, expiresAt: Date): Promise<void> {
  await supabaseAdmin
    .from('jwt_denylist')
    .insert({ jti, expires_at: expiresAt.toISOString() })
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12)
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
