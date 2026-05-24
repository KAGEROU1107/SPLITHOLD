import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { toggleRegistration } from '@/lib/splithold-db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: { open?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (typeof body.open !== 'boolean') {
    return NextResponse.json({ error: '"open" must be a boolean' }, { status: 400 })
  }

  try {
    await toggleRegistration(id, user.id, body.open)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to update registration' }, { status: 500 })
  }
}
