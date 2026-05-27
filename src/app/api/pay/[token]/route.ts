import { NextRequest, NextResponse } from 'next/server'
import { getParticipantByToken, confirmPayment } from '@/lib/splithold-db'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit } from '@/lib/rateLimit'
import { validateFileMagicBytes } from '@/lib/file-validation'

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
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const rateLimitResponse = await rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 5,
    scope: 'pay:confirm',
  })(request, NextResponse.json({}))
  if (rateLimitResponse.status === 429) return rateLimitResponse

  const contentType = request.headers.get('content-type') ?? ''
  let proofStoragePath: string | undefined

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const file = formData.get('proof') as File | null

    if (file && file.size > 0) {
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large — max 5MB' }, { status: 400 })
      }
      // Validate file type by magic bytes — client-controlled MIME headers are not trusted
      const arrayBuffer = await file.arrayBuffer()
      const validation = validateFileMagicBytes(arrayBuffer)
      if (!validation.valid) {
        return NextResponse.json({ error: 'Invalid file type. Use JPG, PNG, WebP, or PDF.' }, { status: 400 })
      }

      // Pre-flight check before uploading
      const participant = await getParticipantByToken(token)
      if (!participant) return NextResponse.json({ error: 'not_found' }, { status: 404 })
      if (participant.status === 'CONFIRMED') return NextResponse.json({ error: 'already_confirmed' }, { status: 409 })
      if (participant.bill.status === 'CLOSED') return NextResponse.json({ error: 'bill_closed' }, { status: 403 })

      // Extension derived from detected type — not from client-supplied filename
      const storagePath = `${participant.bill_id}/${participant.id}/proof.${validation.extension}`

      const { error: uploadError } = await supabaseAdmin.storage
        .from('payment-proofs')
        .upload(storagePath, arrayBuffer, { contentType: validation.detectedType, upsert: true })

      if (uploadError) {
        console.error('[pay/confirm] storage upload error:', uploadError.message)
        return NextResponse.json({ error: 'Failed to upload proof. Please try again.' }, { status: 500 })
      }

      proofStoragePath = storagePath
    }
  }

  const result = await confirmPayment(token, proofStoragePath)

  if (!result.ok) {
    const statusMap: Record<string, number> = {
      not_found: 404,
      already_confirmed: 409,
      bill_closed: 403,
      db_error: 500,
    }
    return NextResponse.json(
      { error: result.reason ?? 'unknown_error' },
      { status: statusMap[result.reason ?? ''] ?? 500 }
    )
  }

  return NextResponse.json({ success: true })
}
