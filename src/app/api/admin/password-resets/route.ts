import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('password_reset_requests')
    .select('id, email, status, requested_at, fulfilled_at, users!password_reset_requests_user_id_fkey(name)')
    .order('requested_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
  return NextResponse.json({ requests: data })
}
