import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword } from '@/lib/auth'
import { sendTempPasswordEmail } from '@/lib/email'
import { logActivity } from '@/lib/activity'

function genTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let result = ''
  for (let i = 0; i < 10; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const { data: resetReq, error: fetchErr } = await supabaseAdmin
    .from('password_reset_requests')
    .select('id, user_id, email, status')
    .eq('id', id)
    .single()

  if (fetchErr || !resetReq) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if (resetReq.status !== 'PENDING') return NextResponse.json({ error: 'Already fulfilled' }, { status: 409 })

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, name')
    .eq('id', resetReq.user_id)
    .single()

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const tempPassword = genTempPassword()
  const tokenHash = await hashPassword(tempPassword)
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { error: updateErr } = await supabaseAdmin
    .from('users')
    .update({
      reset_token: tokenHash,
      reset_token_expiry: expiry,
      must_change_password: true,
    })
    .eq('id', user.id)

  if (updateErr) return NextResponse.json({ error: 'Failed to set temp password' }, { status: 500 })

  const { error: fulfillErr } = await supabaseAdmin
    .from('password_reset_requests')
    .update({
      status: 'FULFILLED',
      fulfilled_at: new Date().toISOString(),
      fulfilled_by: session.id,
    })
    .eq('id', id)

  if (fulfillErr) return NextResponse.json({ error: 'Failed to mark fulfilled' }, { status: 500 })

  await sendTempPasswordEmail(resetReq.email, user.name, tempPassword)

  await logActivity(
    session.id, session.name,
    'password_reset_fulfilled',
    'user', user.id,
    { target_email: resetReq.email }
  )

  return NextResponse.json({ ok: true })
}
