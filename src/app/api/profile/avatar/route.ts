import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { validateCsrfHeader } from '@/lib/csrf'
import { validateFileMagicBytes } from '@/lib/file-validation'
import { supabaseAdmin } from '@/lib/supabase'
import { signToken } from '@/lib/auth'
import { setSessionCookie } from '@/lib/session-cookie'
import { rateLimit } from '@/lib/rateLimit'

const MAX_SIZE = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const BUCKET = 'avatars'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const csrfError = validateCsrfHeader(request)
  if (csrfError) return csrfError

  const rateLimitResponse = await rateLimit({
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
    scope: `avatar:upload:${session.id}`,
  })(request, NextResponse.json({}))
  if (rateLimitResponse.status === 429) return rateLimitResponse

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('avatar')
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'No avatar file provided' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large — maximum 2MB' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const validation = validateFileMagicBytes(buffer)

  if (!validation.valid || !ALLOWED_TYPES.has(validation.detectedType)) {
    return NextResponse.json({ error: 'Invalid file type — only JPG, PNG, or WebP allowed' }, { status: 400 })
  }

  const storagePath = `${session.id}/avatar.${validation.extension}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: validation.detectedType,
      upsert: true,
    })

  if (uploadError) {
    console.error('[avatar] upload error:', uploadError.message)
    return NextResponse.json({ error: 'Upload failed — please try again' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(storagePath)

  const { error: dbError } = await supabaseAdmin
    .from('users')
    .update({ avatar_url: publicUrl })
    .eq('id', session.id)

  if (dbError) {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }

  // Reissue JWT so avatarUrl is reflected in subsequent requests
  const token = await signToken({
    userId: session.id,
    name: session.name,
    email: session.email,
    avatarUrl: publicUrl,
    role: session.role,
    mustChangePassword: session.mustChangePassword ?? false,
  })

  const response = NextResponse.json({ avatarUrl: publicUrl })
  setSessionCookie(response, token)
  return response
}
