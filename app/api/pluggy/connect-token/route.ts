import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { getPluggyClient } from '@/lib/pluggy'

export async function POST() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const pluggy = await getPluggyClient()
    const { accessToken } = await pluggy.createConnectToken()
    return NextResponse.json({ connectToken: accessToken })
  } catch (e: any) {
    console.error('[Pluggy connect-token]', e.message)
    return NextResponse.json({ error: 'Erro ao gerar token Pluggy' }, { status: 500 })
  }
}
