import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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
  const { pathname } = request.nextUrl
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

export const config = {
  matcher: ['/admin/:path*', '/login'],
}
