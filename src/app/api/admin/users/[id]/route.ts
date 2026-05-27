import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { validateCsrfHeader } from '@/lib/csrf'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const csrfError = validateCsrfHeader(request)
  if (csrfError) return csrfError

  const { id } = await params
  const body = await request.json() as { is_active?: boolean }

  if (typeof body.is_active !== 'boolean') {
    return NextResponse.json({ error: 'is_active must be a boolean' }, { status: 400 })
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .update({ is_active: body.is_active })
    .eq('id', id)
    .select('id, name')
    .single()

  if (error || !user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  await logActivity(
    session.id, session.name,
    body.is_active ? 'user_activated' : 'user_deactivated',
    'user', id,
    { target_name: user.name }
  )

  return NextResponse.json({ ok: true })
}
