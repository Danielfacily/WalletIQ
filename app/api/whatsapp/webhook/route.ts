import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseWaMessage, waSendText } from '@/lib/whatsapp'

// Evolution API sends a verification GET on setup
export async function GET() {
  return NextResponse.json({ status: 'ok' })
}

// Evolution API webhook payload (simplified)
interface WaWebhookBody {
  event: string
  instance: string
  data?: {
    key?: { remoteJid?: string; fromMe?: boolean }
    message?: { conversation?: string; extendedTextMessage?: { text?: string } }
    pushName?: string
  }
}

const HELP_TEXT = `*WalletIQ* 💰
Comandos disponíveis:

💸 *Registrar gasto:*
_gastei 50 no almoço_
_paguei 120 na academia_

💰 *Registrar receita:*
_recebi 500 de freela_

📊 *Consultar saldo:*
_saldo_

📋 *Resumo do mês:*
_resumo_

❓ *Ajuda:*
_ajuda_`

export async function POST(req: NextRequest) {
  let body: WaWebhookBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  // Only handle incoming text messages
  if (body.event !== 'messages.upsert' || body.data?.key?.fromMe) {
    return NextResponse.json({ ok: true })
  }

  const jid  = body.data?.key?.remoteJid ?? ''
  const text = (body.data?.message?.conversation ?? body.data?.message?.extendedTextMessage?.text ?? '').trim()
  const phone = jid.replace('@s.whatsapp.net', '').replace('@c.us', '')

  if (!phone || !text) return NextResponse.json({ ok: true })

  // Use service role to look up the user by phone
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .single()

  if (!profile) {
    await waSendText(phone, '❌ Número não vinculado a nenhuma conta WalletIQ. Acesse o app para conectar seu WhatsApp.')
    return NextResponse.json({ ok: true })
  }

  const lower = text.toLowerCase()

  // ── Balance query ────────────────────────────────────────────────────────
  if (/^saldo/.test(lower)) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)

    const [{ data: txs }, { data: fp }] = await Promise.all([
      supabase.from('transactions').select('type,amount').eq('user_id', profile.id).gte('date', monthStart),
      supabase.from('financial_profiles').select('monthly_income,extra_income').eq('user_id', profile.id).single(),
    ])

    const income  = (txs ?? []).filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0)
    const expense = (txs ?? []).filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0)
    const profileIncome = fp ? (fp.monthly_income || 0) + (fp.extra_income || 0) : 0
    const totalIncome = income + profileIncome
    const net = totalIncome - expense

    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
    await waSendText(phone,
      `📊 *Saldo de ${now.toLocaleDateString('pt-BR', { month: 'long' })}*\n\n` +
      `✅ Receita: ${fmt(totalIncome)}\n` +
      `🔴 Gastos: ${fmt(expense)}\n` +
      `${net >= 0 ? '💚' : '🔴'} Saldo: *${fmt(net)}*`
    )
    return NextResponse.json({ ok: true })
  }

  // ── Monthly summary ──────────────────────────────────────────────────────
  if (/^resumo/.test(lower)) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)

    const { data: txs } = await supabase
      .from('transactions').select('type,amount,category,name').eq('user_id', profile.id).gte('date', monthStart)

    const expenses = (txs ?? []).filter((t: any) => t.type === 'expense')
    const catTotals: Record<string, number> = {}
    expenses.forEach((t: any) => { catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount) })

    const CAT_EMOJI: Record<string, string> = {
      food: '🍔', transport: '🚗', housing: '🏠', health: '💊',
      subscription: '📱', education: '📚', leisure: '🎉', other_ex: '📦',
    }

    const lines = Object.entries(catTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([cat, amt]) => `${CAT_EMOJI[cat] ?? '•'} ${cat}: R$ ${amt.toFixed(2).replace('.', ',')}`)
      .join('\n')

    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
    const total = expenses.reduce((s: number, t: any) => s + Number(t.amount), 0)
    await waSendText(phone,
      `📋 *Resumo de ${now.toLocaleDateString('pt-BR', { month: 'long' })}*\n\n` +
      `${lines}\n\n` +
      `*Total gasto: ${fmt(total)}*`
    )
    return NextResponse.json({ ok: true })
  }

  // ── Help ─────────────────────────────────────────────────────────────────
  if (/^(ajuda|help|\?)/.test(lower)) {
    await waSendText(phone, HELP_TEXT)
    return NextResponse.json({ ok: true })
  }

  // ── Transaction registration ─────────────────────────────────────────────
  const parsed = parseWaMessage(text)
  if (!parsed) {
    await waSendText(phone,
      '🤔 Não entendi. Tente:\n_gastei 50 no almoço_\n_recebi 200 de freela_\n\nOu digite *ajuda* para ver os comandos.'
    )
    return NextResponse.json({ ok: true })
  }

  const today = new Date().toISOString().slice(0, 10)
  const { error } = await supabase.from('transactions').insert({
    user_id: profile.id,
    type:     parsed.type,
    amount:   parsed.amount,
    name:     parsed.name,
    category: parsed.category,
    date:     today,
    source:   'whatsapp',
  })

  if (error) {
    console.error('[webhook] insert error', error)
    await waSendText(phone, '❌ Erro ao salvar. Tente novamente.')
    return NextResponse.json({ ok: true })
  }

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  const emoji = parsed.type === 'income' ? '💰' : '💸'
  await waSendText(phone,
    `${emoji} *${parsed.type === 'income' ? 'Receita' : 'Gasto'} registrado!*\n\n` +
    `📝 ${parsed.name}\n` +
    `💵 ${fmt(parsed.amount)}\n` +
    `🏷️ ${parsed.category}\n` +
    `📅 ${new Date().toLocaleDateString('pt-BR')}`
  )

  return NextResponse.json({ ok: true })
}
