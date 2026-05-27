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

  // Admins can view any bill's proof; organizers can only view their own bill's proof
  const query = supabaseAdmin.from('bills').select('id, organizer_id').eq('id', billId)
  const { data: bill } = user.role === 'ADMIN'
    ? await query.single()
    : await query.eq('organizer_id', user.id).single()

  if (!bill) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Get participant proof_url — bill_id filter enforces cross-bill isolation
  const { data: participant } = await supabaseAdmin
    .from('bill_participants')
    .select('id, bill_id, proof_url')
    .eq('id', participantId)
    .eq('bill_id', billId)
    .single()

  if (!participant) return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
  // Explicit belt-and-suspenders: reject if participant belongs to a different bill
  if (participant.bill_id !== billId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!participant.proof_url) return NextResponse.json({ error: 'No proof uploaded' }, { status: 404 })

  // Generate signed URL (60 min expiry)
  const { data, error } = await supabaseAdmin.storage
    .from('payment-proofs')
    .createSignedUrl(participant.proof_url, 3600)

  if (error || !data) {
    console.error('[proof/signed-url] error:', error?.message)
    return NextResponse.json({ error: 'Could not generate proof URL' }, { status: 500 })
  }

  // Redirect directly to the signed URL — client can window.open this endpoint instead of
  // fetching JSON and then navigating, which breaks with noopener window flags.
  return NextResponse.redirect(data.signedUrl)
}
