import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'

export async function POST(request: NextRequest) {
  const rateLimitResponse = await rateLimit({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    scope: 'auth:forgot-password',
  })(request, NextResponse.json({}))
  if (rateLimitResponse.status === 429) return rateLimitResponse

  try {
    const { email } = await request.json()
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, name, email, is_active')
      .eq('email', email.toLowerCase().trim())
      .single()

    // Always return ok — never reveal whether email exists
    if (!user || !user.is_active) {
      return NextResponse.json({ ok: true })
    }

    // Cancel any existing pending request for this user
    await supabaseAdmin
      .from('password_reset_requests')
      .update({ status: 'CANCELLED' })
      .eq('user_id', user.id)
      .eq('status', 'PENDING')

    await supabaseAdmin.from('password_reset_requests').insert({
      user_id: user.id,
      email: user.email,
      status: 'PENDING',
    })

    await logActivity(user.id, user.name, 'password_reset_requested', 'user', user.id, { email: user.email })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/auth/forgot-password] POST failed', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
