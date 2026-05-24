import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getBillById } from '@/lib/splithold-db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const bill = await getBillById(id, session.id)
  if (!bill) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ bill })
}
