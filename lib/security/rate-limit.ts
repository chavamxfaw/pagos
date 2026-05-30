import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type RateLimitScope = 'auth' | 'public_link' | 'stripe_checkout'

type RateLimitOptions = {
  request: Request
  scope: RateLimitScope
  limit: number
  windowSeconds: number
  blockSeconds: number
  failClosed?: boolean
}

type RateLimitResult = {
  allowed: boolean
  retry_after_seconds: number
  request_count: number
  blocked_until: string | null
}

export async function enforceIpRateLimit({
  request,
  scope,
  limit,
  windowSeconds,
  blockSeconds,
  failClosed = false,
}: RateLimitOptions) {
  const ip = getClientIp(request)

  if (!ip) return null

  try {
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('check_ip_rate_limit', {
      p_ip: ip,
      p_scope: scope,
      p_limit: limit,
      p_window_seconds: windowSeconds,
      p_block_seconds: blockSeconds,
    })

    if (error) {
      console.error('Rate limit check failed', { scope, error: error.message })
      return getRateLimitFailureResponse(failClosed)
    }

    const result = Array.isArray(data) ? data[0] as RateLimitResult | undefined : data as RateLimitResult | undefined

    if (!result || result.allowed) return null

    return NextResponse.json(
      {
        error: 'Demasiados intentos. Intenta de nuevo más tarde.',
        retry_after_seconds: result.retry_after_seconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.max(1, result.retry_after_seconds)),
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error('Rate limit unexpected failure', { scope, error })
    return getRateLimitFailureResponse(failClosed)
  }
}

export function getClientIp(request: Request) {
  const headers = request.headers
  const vercelForwardedFor = headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
  const realIp = headers.get('x-real-ip')?.trim()
  const cloudflareIp = headers.get('cf-connecting-ip')?.trim()
  const forwardedFor = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const candidate = vercelForwardedFor || realIp || cloudflareIp || forwardedFor

  if (!candidate) return null

  return stripPort(candidate)
}

function getRateLimitFailureResponse(failClosed: boolean) {
  if (!failClosed) return null

  return NextResponse.json(
    { error: 'No se pudo validar el límite de intentos. Intenta de nuevo más tarde.' },
    {
      status: 503,
      headers: {
        'Retry-After': '60',
        'Cache-Control': 'no-store',
      },
    }
  )
}

function stripPort(value: string) {
  if (value.startsWith('[')) return value.slice(1, value.indexOf(']'))

  const parts = value.split(':')
  if (parts.length === 2 && /^\d+$/.test(parts[1])) return parts[0]

  return value
}
