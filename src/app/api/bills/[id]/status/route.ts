import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { validateCsrfHeader } from '@/lib/csrf'
import { rateLimit } from '@/lib/rateLimit'
import { updateBillStatus } from '@/lib/splithold-db'
import { logActivity } from '@/lib/activity'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const csrfError = validateCsrfHeader(request)
  if (csrfError) return csrfError
  const rl = await rateLimit({ windowMs: 60 * 1000, maxRequests: 20, scope: 'bills:status' })(request, NextResponse.json({}))
  if (rl.status === 429) return rl

  const { id } = await params

  try {
    const body = await request.json() as { status?: string }
    if (body.status !== 'ACTIVE' && body.status !== 'CLOSED') {
      return NextResponse.json({ error: 'status must be ACTIVE or CLOSED' }, { status: 400 })
    }

    await updateBillStatus(id, session.id, body.status)
    await logActivity(
      session.id, session.name,
      body.status === 'CLOSED' ? 'bill_closed' : 'bill_reopened',
      'bill', id
    )
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to update bill status' }, { status: 500 })
  }
}
