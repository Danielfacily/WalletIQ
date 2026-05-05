import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { getPluggyClient } from '@/lib/pluggy'

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { itemId } = await req.json()
  if (!itemId) return NextResponse.json({ error: 'itemId obrigatório' }, { status: 400 })

  try {
    const pluggy = getPluggyClient()

    // Fetch item details from Pluggy
    const item = await pluggy.fetchItem(itemId)

    // Upsert item record
    const { data: itemRow, error: itemErr } = await supabase
      .from('pluggy_items')
      .upsert({
        user_id:        user.id,
        item_id:        item.id,
        connector_name: item.connector.name,
        connector_id:   item.connector.id,
        status:         item.status,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'item_id' })
      .select('id')
      .single()

    if (itemErr) throw new Error(itemErr.message)

    // Fetch and upsert accounts
    const { results: accounts } = await pluggy.fetchAccounts(itemId)
    for (const acc of accounts) {
      await supabase.from('pluggy_accounts').upsert({
        user_id:    user.id,
        item_id:    itemRow.id,
        account_id: acc.id,
        name:       acc.name,
        type:       acc.type,
        subtype:    acc.subtype ?? null,
        balance:    acc.balance,
        currency:   acc.currencyCode ?? 'BRL',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'account_id' })

      // Import transactions from last 90 days into the transactions table
      const from = new Date()
      from.setDate(from.getDate() - 90)
      const { results: txs } = await pluggy.fetchTransactions(acc.id, {
        from: from.toISOString().slice(0, 10),
      })

      for (const tx of txs) {
        await supabase.from('transactions').upsert({
          user_id:  user.id,
          name:     tx.description,
          type:     tx.type === 'CREDIT' ? 'income' : 'expense',
          category: 'other_ex',
          amount:   Math.abs(tx.amount),
          date:     tx.date.slice(0, 10),
          source:   'pluggy',
          external_id: tx.id,
        }, { onConflict: 'external_id' })
      }
    }

    return NextResponse.json({ ok: true, accounts: accounts.length })
  } catch (e: any) {
    console.error('[Pluggy sync]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
