import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'
import { signToken, comparePassword, hashPassword } from '@/lib/auth'
import { setSessionCookie } from '@/lib/session-cookie'

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json() as { name?: string; currentPassword?: string; newPassword?: string }
    const update: Record<string, unknown> = {}

    if (body.name?.trim()) update.name = body.name.trim()

    if (body.newPassword) {
      if (body.newPassword.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
      }

      // If user must change password (temp password login), skip current password check
      if (!session.mustChangePassword) {
        if (!body.currentPassword) {
          return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
        }
        const { data: user } = await supabaseAdmin.from('users').select('password_hash').eq('id', session.id).single()
        if (!user || !await comparePassword(body.currentPassword, user.password_hash)) {
          return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
        }
      }

      update.password_hash = await hashPassword(body.newPassword)
      update.must_change_password = false
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update(update)
      .eq('id', session.id)
      .select('id, name, email, avatar_url, role, must_change_password')
      .single()

    if (error || !updatedUser) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

    // Reissue JWT if password changed (clears mustChangePassword from token)
    const response = NextResponse.json({ success: true })
    if (body.newPassword) {
      const token = await signToken({
        userId: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatarUrl: updatedUser.avatar_url ?? null,
        role: updatedUser.role ?? session.role,
        mustChangePassword: false,
      })
      setSessionCookie(response, token)
    }

    return response
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
