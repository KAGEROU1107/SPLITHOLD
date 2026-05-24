import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'

export interface JwtPayload {
  userId: string
  name: string
  email: string
  avatarUrl: string | null
}

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET environment variable is not set')
  return new TextEncoder().encode(s)
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as JwtPayload
  } catch {
    return null
  }
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12)
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
