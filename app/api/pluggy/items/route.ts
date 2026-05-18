import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { getPluggyClient } from '@/lib/pluggy'

export async function GET() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('pluggy_items')
    .select('*, pluggy_accounts(id, name, type, balance, currency)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { itemId } = await req.json()
  if (!itemId) return NextResponse.json({ error: 'itemId obrigatório' }, { status: 400 })

  // Verify ownership
  const { data: item } = await supabase
    .from('pluggy_items')
    .select('id, item_id')
    .eq('item_id', itemId)
    .eq('user_id', user.id)
    .single()

  if (!item) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })

  try {
    const pluggy = await getPluggyClient()
    await pluggy.deleteItem(itemId)
  } catch {
    // Continue even if Pluggy delete fails — clean up locally
  }

  await supabase.from('pluggy_items').delete().eq('id', item.id)
  return NextResponse.json({ ok: true })
}
