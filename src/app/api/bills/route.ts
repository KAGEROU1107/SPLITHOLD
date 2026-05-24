import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createBill, getBillsByOrganizer, type CreateBillInput } from '@/lib/splithold-db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const bills = await getBillsByOrganizer(session.id)
    return NextResponse.json({ bills })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json() as {
      title?: string
      description?: string
      total_amount_cents?: number
      due_date?: string
      participants?: Array<{ name?: string; email?: string; amount_cents?: number }>
    }

    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!body.total_amount_cents || body.total_amount_cents < 1) {
      return NextResponse.json({ error: 'Total amount must be at least 1 cent' }, { status: 400 })
    }
    if (!body.due_date) {
      return NextResponse.json({ error: 'Due date is required' }, { status: 400 })
    }
    if (!Array.isArray(body.participants) || body.participants.length === 0) {
      return NextResponse.json({ error: 'At least one participant is required' }, { status: 400 })
    }

    for (const [i, p] of body.participants.entries()) {
      if (!p.name?.trim()) {
        return NextResponse.json({ error: `Participant ${i + 1}: name is required` }, { status: 400 })
      }
      if (!p.amount_cents || p.amount_cents < 1) {
        return NextResponse.json({ error: `Participant ${i + 1}: amount must be at least 1 cent` }, { status: 400 })
      }
    }

    const input: CreateBillInput = {
      title: body.title.trim(),
      description: body.description?.trim() || undefined,
      total_amount_cents: body.total_amount_cents,
      due_date: body.due_date,
      participants: body.participants.map(p => ({
        name: p.name!.trim(),
        email: p.email?.trim() || undefined,
        amount_cents: p.amount_cents!,
      })),
    }

    const bill = await createBill(session.id, input)
    return NextResponse.json({ bill }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create bill' }, { status: 500 })
  }
}
