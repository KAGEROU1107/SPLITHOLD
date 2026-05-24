import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from './supabase'

const requestMap = new Map<string, { count: number; resetTime: number }>()

function cleanupExpiredEntries(now = Date.now()) {
  for (const [key, value] of requestMap.entries()) {
    if (now > value.resetTime) {
      requestMap.delete(key)
    }
  }
}

function buildRetryAfter(resetTime: number, now: number) {
  return Math.max(1, Math.ceil((resetTime - now) / 1000)).toString()
}

export function rateLimit(options: {
  windowMs: number // window size in milliseconds
  maxRequests: number // max requests per window
  scope?: string
}) {
  return async (request: NextRequest, response: NextResponse) => {
    // Get IP address (works for Vercel and local development)
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const now = Date.now()
    const windowMs = options.windowMs
    const maxRequests = options.maxRequests
    const scope = options.scope ?? request.nextUrl.pathname
    const bucketKey = `${scope}:${ip}`

    try {
      const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
        bucket_key: bucketKey,
        window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
        max_requests: maxRequests,
      })

      if (error) {
        throw error
      }

      const result = data as
        | {
            allowed: boolean
            count: number
            max_requests: number
            reset_at: string
          }
        | null

      if (result && !result.allowed) {
        const resetTime = new Date(result.reset_at).getTime()
        return NextResponse.json(
          {
            error: 'Terlalu banyak permintaan. Sila cuba lagi setelah beberapa saat.'
          },
          {
            status: 429,
            headers: {
              'Retry-After': buildRetryAfter(resetTime, now),
            },
          }
        )
      }

      return response
    } catch (error) {
      console.warn('[rateLimit] Supabase RPC unavailable, falling back to in-memory limiter', error)
    }

    cleanupExpiredEntries(now)

    // Get or create entry for this IP
    const entry = requestMap.get(bucketKey) || { count: 0, resetTime: now + windowMs }

    // Reset window if expired
    if (now > entry.resetTime) {
      entry.count = 0
      entry.resetTime = now + windowMs
    }

    // Increment request count
    entry.count++

    // Store updated entry
    requestMap.set(bucketKey, entry)

    // Check if limit exceeded
    if (entry.count > maxRequests) {
      return NextResponse.json(
        {
          error: 'Terlalu banyak permintaan. Sila cuba lagi setelah beberapa saat.'
        },
        {
          status: 429,
          headers: {
            'Retry-After': buildRetryAfter(entry.resetTime, now)
          }
        }
      )
    }

    // Return response if limit not exceeded
    return response
  }
}
