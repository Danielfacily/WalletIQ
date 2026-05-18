import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { generateAlerts } from '@/lib/alerts-engine'
import { waSendText } from '@/lib/whatsapp'

export async function GET() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: alerts } = await supabase
    .from('alerts')
    .select('*')
    .eq('user_id', user.id)
    .eq('dismissed', false)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ alerts: alerts ?? [] })
}

export async function POST() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().slice(0, 10)

  const [{ data: transactions }, { data: fixed }, { data: goals }, { data: fp }, { data: todayAlerts }] = await Promise.all([
    supabase.from('transactions').select('*').eq('user_id', user.id)
      .gte('date', threeMonthsAgo).order('date', { ascending: false }),
    supabase.from('fixed_budgets').select('*').eq('user_id', user.id).eq('active', true),
    supabase.from('goals').select('*').eq('user_id', user.id),
    supabase.from('financial_profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('alerts').select('type').eq('user_id', user.id)
      .gte('created_at', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()),
  ])

  const existingAlertTypes = (todayAlerts ?? []).map((a: any) => a.type)

  const generated = generateAlerts({
    userId: user.id,
    transactions: (transactions ?? []).map((t: any) => ({
      id: t.id,
      type: t.type,
      category: t.category,
      amount: Number(t.amount),
      date: t.date,
      name: t.name,
    })),
    fixed: (fixed ?? []).map((f: any) => ({
      id: f.id,
      type: f.type,
      category: f.category,
      amount: Number(f.amount),
      name: f.name,
    })),
    goals: (goals ?? []).map((g: any) => ({
      id: g.id,
      name: g.name,
      target_amount: Number(g.target_amount),
      saved_amount: Number(g.saved_amount),
      deadline: g.deadline,
    })),
    financialProfile: fp ?? null,
    existingAlertTypes,
  })

  if (generated.length === 0) {
    return NextResponse.json({ inserted: 0 })
  }

  const { error } = await supabase.from('alerts').insert(
    generated.map(a => ({ ...a, user_id: user.id }))
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send critical alerts via WhatsApp if user has phone on file
  const critical = generated.filter(a => a.severity === 'critical')
  if (critical.length > 0) {
    const { data: profile } = await supabase.from('profiles').select('phone').eq('id', user.id).single()
    if (profile?.phone) {
      const msgs = critical.map(a => `🚨 *${a.title}*\n${a.message}`).join('\n\n')
      await waSendText(profile.phone, `*Alerta WalletIQ*\n\n${msgs}`)
    }
  }

  return NextResponse.json({ inserted: generated.length })
}

export async function PATCH(req: Request) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, action } = await req.json()
  const update = action === 'dismiss' ? { dismissed: true } : { read: true }

  await supabase.from('alerts').update(update).eq('id', id).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
