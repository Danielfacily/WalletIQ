import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {
        get(n)        { return req.cookies.get(n)?.value },
        set(n,v,o)    { res.cookies.set({ name:n, value:v, ...o }) },
        remove(n,o)   { res.cookies.set({ name:n, value:'', ...o }) },
    }}
  )
  const { data: { session } } = await supabase.auth.getSession()

  // Protected routes
  if (req.nextUrl.pathname.startsWith('/dashboard') ||
      req.nextUrl.pathname.startsWith('/transactions') ||
      req.nextUrl.pathname.startsWith('/annual') ||
      req.nextUrl.pathname.startsWith('/market') ||
      req.nextUrl.pathname.startsWith('/consultant')) {
    if (!session) return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  // Redirect logged-in users away from auth pages
  if (session && (req.nextUrl.pathname.startsWith('/auth/login') ||
                  req.nextUrl.pathname.startsWith('/auth/register'))) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
