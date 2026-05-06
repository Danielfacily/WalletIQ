import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { phone } = await req.json()
  const cleaned = (phone ?? '').toString().replace(/\D/g, '')

  if (cleaned && (cleaned.length < 10 || cleaned.length > 15)) {
    return NextResponse.json({ error: 'invalid phone' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ phone: cleaned || null })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
