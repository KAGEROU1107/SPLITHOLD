import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { validateCsrfHeader } from '@/lib/csrf'
import { rateLimit } from '@/lib/rateLimit'
import { reviewParticipant } from '@/lib/splithold-db'
import { logActivity } from '@/lib/activity'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const csrfError = validateCsrfHeader(req)
  if (csrfError) return csrfError
  const rl = await rateLimit({ windowMs: 60 * 1000, maxRequests: 60, scope: 'bills:review' })(req, NextResponse.json({}))
  if (rl.status === 429) return rl

  const { id: billId, participantId } = await params

  let body: { action?: string; reason?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { action, reason } = body
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
  }
  if (action === 'reject' && reason !== undefined && typeof reason !== 'string') {
    return NextResponse.json({ error: 'reason must be a string' }, { status: 400 })
  }

  const result = await reviewParticipant(billId, user.id, participantId, action, reason)

  if (!result.ok) {
    if (result.reason === 'not_found') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (result.reason === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (result.reason === 'already_reviewed') return NextResponse.json({ error: 'Already reviewed' }, { status: 409 })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  await logActivity(
    user.id, user.name,
    action === 'approve' ? 'payment_approved' : 'payment_rejected',
    'participant', participantId,
    { bill_id: billId }
  )

  return NextResponse.json({ ok: true })
}
