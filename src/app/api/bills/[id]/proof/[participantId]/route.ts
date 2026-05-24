import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: billId, participantId } = await params

  // Verify organizer owns this bill
  const { data: bill } = await supabaseAdmin
    .from('bills')
    .select('id, organizer_id')
    .eq('id', billId)
    .eq('organizer_id', user.id)
    .single()

  if (!bill) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Get participant proof_url
  const { data: participant } = await supabaseAdmin
    .from('bill_participants')
    .select('id, proof_url')
    .eq('id', participantId)
    .eq('bill_id', billId)
    .single()

  if (!participant) return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
  if (!participant.proof_url) return NextResponse.json({ error: 'No proof uploaded' }, { status: 404 })

  // Generate signed URL (60 min expiry)
  const { data, error } = await supabaseAdmin.storage
    .from('payment-proofs')
    .createSignedUrl(participant.proof_url, 3600)

  if (error || !data) {
    console.error('[proof/signed-url] error:', error?.message)
    return NextResponse.json({ error: 'Could not generate proof URL' }, { status: 500 })
  }

  return NextResponse.json({ url: data.signedUrl })
}
