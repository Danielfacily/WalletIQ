import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error)}`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=missing_code`)
  }

  const supabase = await createSupabaseServer()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return NextResponse.redirect(`${origin}/auth/login?error=exchange_failed`)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
