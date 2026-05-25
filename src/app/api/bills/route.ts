import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createBill, getBillsByOrganizer, type CreateBillInput } from '@/lib/splithold-db'
import { logActivity } from '@/lib/activity'

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
      bank_name?: string
      bank_account_number?: string
      bank_account_name?: string
      participants?: Array<{ name?: string; email?: string; amount_cents?: number }>
      open_mode?: boolean
      max_participants?: number
      amount_per_pax_cents?: number
    }

    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!body.due_date) {
      return NextResponse.json({ error: 'Due date is required' }, { status: 400 })
    }

    const isOpenMode = body.open_mode === true

    if (isOpenMode) {
      if (!body.amount_per_pax_cents || body.amount_per_pax_cents < 1) {
        return NextResponse.json({ error: 'Amount per person must be at least 1 cent' }, { status: 400 })
      }
      if (body.max_participants !== undefined && body.max_participants < 1) {
        return NextResponse.json({ error: 'Max participants must be at least 1' }, { status: 400 })
      }
    } else {
      if (!body.total_amount_cents || body.total_amount_cents < 1) {
        return NextResponse.json({ error: 'Total amount must be at least 1 cent' }, { status: 400 })
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
    }

    const input: CreateBillInput = {
      title: body.title.trim(),
      description: body.description?.trim() || undefined,
      total_amount_cents: body.total_amount_cents ?? 0,
      due_date: body.due_date,
      bank_name: body.bank_name?.trim() || undefined,
      bank_account_number: body.bank_account_number?.trim() || undefined,
      bank_account_name: body.bank_account_name?.trim() || undefined,
      participants: isOpenMode ? [] : (body.participants ?? []).map(p => ({
        name: p.name!.trim(),
        email: p.email?.trim() || undefined,
        amount_cents: p.amount_cents!,
      })),
      open_mode: isOpenMode,
      max_participants: body.max_participants,
      amount_per_pax_cents: body.amount_per_pax_cents,
    }

    const bill = await createBill(session.id, input)
    await logActivity(session.id, session.name, 'bill_created', 'bill', bill.id, { title: bill.title })
    return NextResponse.json({ bill }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create bill' }, { status: 500 })
  }
}
