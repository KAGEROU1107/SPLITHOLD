import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { validateCsrfHeader } from '@/lib/csrf'
import { rateLimit } from '@/lib/rateLimit'
import { getBillById, deleteBill } from '@/lib/splithold-db'
import { logActivity } from '@/lib/activity'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const bill = await getBillById(id, session.id, session.role === 'ADMIN')
  if (!bill) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ bill })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const csrfError = validateCsrfHeader(request)
  if (csrfError) return csrfError
  const rl = await rateLimit({ windowMs: 60 * 1000, maxRequests: 10, scope: 'bills:delete' })(request, NextResponse.json({}))
  if (rl.status === 429) return rl

  const { id } = await params
  const result = await deleteBill(id, session.id, session.role === 'ADMIN')

  if (!result.ok) {
    if (result.reason === 'not_found') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (result.reason === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }

  await logActivity(
    session.id, session.name,
    'bill_deleted',
    'bill', id,
    { title: result.title, participant_count: result.participantCount }
  )

  return NextResponse.json({ ok: true })
}
