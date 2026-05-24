import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json() as { name?: string; currentPassword?: string; newPassword?: string }
    const update: Record<string, unknown> = {}

    if (body.name?.trim()) update.name = body.name.trim()

    if (body.newPassword) {
      if (!body.currentPassword) {
        return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
      }
      if (body.newPassword.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
      }
      const { comparePassword, hashPassword } = await import('@/lib/auth')
      const { data: user } = await supabaseAdmin.from('users').select('password_hash').eq('id', session.id).single()
      if (!user || !await comparePassword(body.currentPassword, user.password_hash)) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }
      update.password_hash = await hashPassword(body.newPassword)
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('users').update(update).eq('id', session.id)
    if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
