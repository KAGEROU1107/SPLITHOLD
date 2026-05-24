import { NextRequest, NextResponse } from 'next/server'
import { getParticipantByToken, confirmPayment } from '@/lib/splithold-db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const participant = await getParticipantByToken(token)
  if (!participant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ participant })
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const result = await confirmPayment(token)

  if (!result.ok) {
    const status = result.reason === 'not_found' ? 404 : 409
    return NextResponse.json({ error: result.reason }, { status })
  }

  return NextResponse.json({ success: true })
}
