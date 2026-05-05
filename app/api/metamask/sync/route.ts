import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { getEthBalance, getNormalTxs, getErc20Txs } from '@/lib/etherscan'

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { address } = await req.json()
  if (!address) return NextResponse.json({ error: 'address obrigatório' }, { status: 400 })

  const normalized = address.toLowerCase()

  // Verify wallet belongs to this user
  const { data: wallet } = await supabase
    .from('crypto_wallets')
    .select('id')
    .eq('user_id', user.id)
    .eq('address', normalized)
    .single()

  if (!wallet) return NextResponse.json({ error: 'Carteira não encontrada' }, { status: 404 })

  try {
    const [balance, normalTxs, erc20Txs] = await Promise.all([
      getEthBalance(normalized),
      getNormalTxs(normalized),
      getErc20Txs(normalized),
    ])

    // Update balance
    await supabase.from('crypto_wallets').update({
      eth_balance:    balance,
      last_synced_at: new Date().toISOString(),
    }).eq('id', wallet.id)

    let imported = 0

    // Import ETH transactions (skip 0-value and failed)
    for (const tx of normalTxs) {
      if (tx.isError === '1' || tx.value === '0') continue
      const ethAmount = Number(tx.value) / 1e18
      if (ethAmount < 0.0001) continue

      const isIncoming = tx.to.toLowerCase() === normalized
      const date = new Date(Number(tx.timeStamp) * 1000).toISOString().slice(0, 10)
      const label = tx.functionName ? tx.functionName.split('(')[0] : (isIncoming ? 'Recebido ETH' : 'Enviado ETH')

      await supabase.from('transactions').upsert({
        user_id:     user.id,
        name:        `${label} (${ethAmount.toFixed(4)} ETH)`,
        type:        isIncoming ? 'income' : 'expense',
        category:    'crypto',
        amount:      ethAmount,
        date,
        source:      'metamask',
        external_id: `eth_${tx.hash}`,
      }, { onConflict: 'external_id' })

      imported++
    }

    // Import ERC-20 token transactions
    for (const tx of erc20Txs) {
      const decimals  = Number(tx.tokenDecimal ?? 18)
      const amount    = Number(tx.value) / Math.pow(10, decimals)
      if (amount < 0.0001) continue

      const isIncoming = tx.to?.toLowerCase() === normalized
      const date = new Date(Number(tx.timeStamp) * 1000).toISOString().slice(0, 10)
      const symbol = tx.tokenSymbol ?? 'TOKEN'

      await supabase.from('transactions').upsert({
        user_id:     user.id,
        name:        `${isIncoming ? 'Recebido' : 'Enviado'} ${amount.toFixed(4)} ${symbol}`,
        type:        isIncoming ? 'income' : 'expense',
        category:    'crypto',
        amount,
        date,
        source:      'metamask',
        external_id: `erc20_${tx.hash}_${tx.to}`,
      }, { onConflict: 'external_id' })

      imported++
    }

    return NextResponse.json({ ok: true, balance, imported })
  } catch (e: any) {
    console.error('[MetaMask sync]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
