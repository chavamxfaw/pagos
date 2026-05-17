import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { enforceIpRateLimit } from '@/lib/security/rate-limit'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const { pathname } = request.nextUrl

  const rateLimitResponse = await getMiddlewareRateLimitResponse(request, pathname)
  if (rateLimitResponse) return rateLimitResponse

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  let isAdmin = false

  if (user) {
    const { data: adminUser } = await supabase
      .from('app_admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    isAdmin = Boolean(adminUser)
  }

  // Proteger rutas admin
  if (pathname.startsWith('/admin') && !isAdmin) {
    const loginUrl = new URL('/login', request.url)
    if (user) loginUrl.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(loginUrl)
  }

  // Si ya está autenticado y va a /login, redirigir al admin
  if (pathname === '/login' && isAdmin) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return supabaseResponse
}

function getMiddlewareRateLimitResponse(request: NextRequest, pathname: string) {
  if (pathname === '/login') {
    return enforceIpRateLimit({
      request,
      scope: 'auth',
      limit: 25,
      windowSeconds: 300,
      blockSeconds: 900,
    })
  }

  if (pathname.startsWith('/p/') || pathname.startsWith('/c/') || pathname.startsWith('/d/')) {
    return enforceIpRateLimit({
      request,
      scope: 'public_link',
      limit: 120,
      windowSeconds: 300,
      blockSeconds: 900,
    })
  }

  return null
}

export const config = {
  matcher: ['/admin/:path*', '/login', '/p/:path*', '/c/:path*', '/d/:path*'],
}
