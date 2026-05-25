import { NextRequest, NextResponse } from 'next/server'
import { signToken, comparePassword } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { setSessionCookie } from '@/lib/session-cookie'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const rateLimitResponse = await rateLimit({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    scope: 'auth:login',
  })(request, NextResponse.json({}))
  if (rateLimitResponse.status === 429) return rateLimitResponse

  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, password_hash, avatar_url, is_active, role, must_change_password, reset_token, reset_token_expiry')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (!user.is_active) {
      return NextResponse.json({ error: 'Account is inactive' }, { status: 403 })
    }

    let valid = await comparePassword(password, user.password_hash)
    let mustChangePassword = user.must_change_password ?? false

    // Try temp password (reset_token) if regular password failed
    if (!valid && user.reset_token && user.reset_token_expiry) {
      const expiry = new Date(user.reset_token_expiry)
      if (expiry > new Date()) {
        const tempValid = await comparePassword(password, user.reset_token)
        if (tempValid) {
          valid = true
          mustChangePassword = true
          await supabaseAdmin
            .from('users')
            .update({ reset_token: null, reset_token_expiry: null, must_change_password: true })
            .eq('id', user.id)
        }
      }
    }

    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const token = await signToken({
      userId: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatar_url ?? null,
      role: user.role ?? 'ORGANIZER',
      mustChangePassword,
    })

    const response = NextResponse.json({ redirect: '/dashboard' })
    setSessionCookie(response, token)
    return response
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
