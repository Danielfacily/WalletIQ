import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { waSendText } from '@/lib/whatsapp'

interface SendBody {
  message: string
  phone?: string  // override; defaults to user's profile phone
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: SendBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!body.message?.trim()) {
    return NextResponse.json({ error: 'message required' }, { status: 400 })
  }

  // Resolve phone — from body override or profile
  let phone = body.phone
  if (!phone) {
    const { data: profile } = await supabase.from('profiles').select('phone').eq('id', user.id).single()
    phone = profile?.phone
  }

  if (!phone) {
    return NextResponse.json({ error: 'no phone on file' }, { status: 422 })
  }

  const result = await waSendText(phone, body.message)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
