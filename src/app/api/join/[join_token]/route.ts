import { NextRequest, NextResponse } from 'next/server'
import { getBillByJoinToken, joinBillSafe } from '@/lib/splithold-db'
import { rateLimit } from '@/lib/rateLimit'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ join_token: string }> }
) {
  const { join_token } = await params
  const bill = await getBillByJoinToken(join_token)

  if (!bill) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const slotsRemaining = bill.max_participants !== null
    ? Math.max(0, bill.max_participants - bill.slot_count)
    : null

  return NextResponse.json({ bill, slots_remaining: slotsRemaining })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ join_token: string }> }
) {
  const limitRes = await rateLimit({ windowMs: 60_000, maxRequests: 5, scope: 'join-bill' })(
    request, NextResponse.next()
  )
  if (limitRes.status === 429) return limitRes

  const { join_token } = await params

  let body: { name?: string; phone?: string; email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const name = body.name?.trim()
  const phone = body.phone?.trim()
  const email = body.email?.trim() || null

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!phone) return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
  if (name.length > 100) return NextResponse.json({ error: 'Name too long' }, { status: 400 })
  if (phone.length > 20) return NextResponse.json({ error: 'Phone number too long' }, { status: 400 })

  const result = await joinBillSafe(join_token, name, email, phone)

  if (!result.ok) {
    const messages: Record<string, { message: string; status: number }> = {
      bill_not_found:       { message: 'This join link is invalid.',              status: 404 },
      registration_closed:  { message: 'Registration is currently closed.',       status: 409 },
      bill_closed:          { message: 'This bill has been closed.',               status: 409 },
      slots_full:           { message: 'All slots are taken. Registration full.',  status: 409 },
      db_error:             { message: 'Something went wrong. Please try again.',  status: 500 },
    }
    const mapped = messages[result.error ?? 'db_error'] ?? messages.db_error
    return NextResponse.json({ error: mapped.message }, { status: mapped.status })
  }

  return NextResponse.json({ payment_token: result.paymentToken }, { status: 201 })
}
