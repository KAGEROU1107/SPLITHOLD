import { NextRequest, NextResponse } from 'next/server'
import { signToken, hashPassword } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { setSessionCookie } from '@/lib/session-cookie'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const rateLimitResponse = await rateLimit({
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
    scope: 'auth:register',
  })(request, NextResponse.json({}))
  if (rateLimitResponse.status === 429) return rateLimitResponse

  try {
    const { name, email, password } = await request.json()
    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        role: 'ADMIN',
        is_active: true,
      })
      .select('id, name, email, avatar_url')
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
    }

    const token = await signToken({
      userId: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatar_url ?? null,
    })

    const response = NextResponse.json({ redirect: '/dashboard' })
    setSessionCookie(response, token)
    return response
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
