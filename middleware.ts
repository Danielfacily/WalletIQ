import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  // CVE-2025-29927: block attempts to spoof internal Next.js RSC subrequest header
  if (req.headers.has('x-middleware-subrequest')) {
    return new NextResponse(null, { status: 403 })
  }

  const res = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(n)     { return req.cookies.get(n)?.value },
        set(n,v,o) { res.cookies.set({ name: n, value: v, ...o }) },
        remove(n,o){ res.cookies.set({ name: n, value: '', ...o }) },
      },
    }
  )

  // getUser() validates against Supabase auth server — cannot be spoofed via cookie
  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes
  if (
    req.nextUrl.pathname.startsWith('/dashboard') ||
    req.nextUrl.pathname.startsWith('/transactions') ||
    req.nextUrl.pathname.startsWith('/annual') ||
    req.nextUrl.pathname.startsWith('/market') ||
    req.nextUrl.pathname.startsWith('/consultant')
  ) {
    if (!user) return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  // Redirect logged-in users away from auth pages
  if (
    user && (
      req.nextUrl.pathname.startsWith('/auth/login') ||
      req.nextUrl.pathname.startsWith('/auth/register')
    )
  ) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
