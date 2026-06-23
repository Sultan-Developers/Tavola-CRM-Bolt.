import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log('[middleware] route:', request.nextUrl.pathname, 'user:', user?.id ?? 'none')

  const publicPaths = [
    '/login',
    '/signup',
    '/forgot-password',
    '/auth/confirm',
    '/auth/callback',
    '/auth/update-password',
    '/onboarding',
  ]
  const isPublic = publicPaths.some(
    (p) => request.nextUrl.pathname === p || request.nextUrl.pathname.startsWith(p + '/')
  )

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    console.log('[middleware] redirecting to login')
    return NextResponse.redirect(url)
  }

  const authOnly = ['/login', '/signup', '/forgot-password']
  if (
    user &&
    authOnly.some(
      (p) => request.nextUrl.pathname === p || request.nextUrl.pathname.startsWith(p + '/')
    )
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    console.log('[middleware] redirecting to dashboard')
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
