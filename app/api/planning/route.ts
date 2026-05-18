import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

const BRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export async function GET() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()

  const [{ data: plan }, { data: fp }, { data: fixed }, { data: txs }] = await Promise.all([
    supabase.from('financial_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('year', now.getFullYear())
      .eq('month', now.getMonth() + 1)
      .single(),
    supabase.from('financial_profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('fixed_budgets').select('*').eq('user_id', user.id).eq('active', true),
    supabase.from('transactions').select('*').eq('user_id', user.id)
      .gte('date', new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10))
      .lte('date', now.toISOString().slice(0, 10)),
  ])

  const totalIncome = fp ? (fp.monthly_income || 0) + (fp.extra_income || 0) : 0
  const savingsPct = fp?.savings_target_pct ?? 20
  const needsPct = Math.min(60, Math.max(30, 80 - savingsPct))
  const wantsPct = 100 - savingsPct - needsPct

  const monthExpenses = (txs || []).filter((t: any) => t.type === 'expense')
  const expByCat: Record<string, number> = {}
  monthExpenses.forEach((t: any) => {
    expByCat[t.category] = (expByCat[t.category] || 0) + Number(t.amount)
  })

  const fixedExpenses = (fixed || []).filter((f: any) => f.type === 'expense')
  const totalFixed = fixedExpenses.reduce((s: number, f: any) => s + Number(f.amount), 0)
  const totalVar = monthExpenses.reduce((s: number, t: any) => s + Number(t.amount), 0)

  const NEEDS_CATS = ['housing', 'food', 'transport', 'health']
  const WANTS_CATS = ['leisure', 'subscription', 'education', 'other_ex']

  const needsSpent = monthExpenses
    .filter((t: any) => NEEDS_CATS.includes(t.category))
    .reduce((s: number, t: any) => s + Number(t.amount), 0) + totalFixed

  const wantsSpent = monthExpenses
    .filter((t: any) => WANTS_CATS.includes(t.category))
    .reduce((s: number, t: any) => s + Number(t.amount), 0)

  const currentPlan = plan ?? {
    needs_budget:   totalIncome * needsPct / 100,
    wants_budget:   totalIncome * wantsPct / 100,
    savings_budget: totalIncome * savingsPct / 100,
    income_base:    totalIncome,
  }

  const categories = buildCategoryPlan(fixed || [], txs || [], currentPlan, totalIncome)

  return NextResponse.json({
    plan: currentPlan,
    actuals: {
      needs:   needsSpent,
      wants:   wantsSpent,
      savings: Math.max(0, totalIncome - needsSpent - wantsSpent),
      total:   totalFixed + totalVar,
    },
    pcts: { needs: needsPct, wants: wantsPct, savings: savingsPct },
    categories,
    total_income: totalIncome,
    has_profile: !!fp,
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const now = new Date()

  const { data, error } = await supabase
    .from('financial_plans')
    .upsert({
      user_id:        user.id,
      year:           now.getFullYear(),
      month:          now.getMonth() + 1,
      income_base:    body.income_base,
      needs_budget:   body.needs_budget,
      wants_budget:   body.wants_budget,
      savings_budget: body.savings_budget,
      limits:         body.limits ?? {},
      auto_generated: body.auto_generated ?? true,
    }, { onConflict: 'user_id,year,month' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plan: data })
}

function buildCategoryPlan(fixed: any[], txs: any[], plan: any, income: number) {
  const CATEGORIES = [
    { id: 'housing',      name: 'Moradia',      icon: '🏠', bucket: 'needs', pct: 30 },
    { id: 'food',         name: 'Alimentação',  icon: '🍔', bucket: 'needs', pct: 15 },
    { id: 'transport',    name: 'Transporte',   icon: '🚗', bucket: 'needs', pct: 10 },
    { id: 'health',       name: 'Saúde',        icon: '💊', bucket: 'needs', pct: 5  },
    { id: 'leisure',      name: 'Lazer',        icon: '🎮', bucket: 'wants', pct: 10 },
    { id: 'subscription', name: 'Assinaturas',  icon: '📱', bucket: 'wants', pct: 8  },
    { id: 'education',    name: 'Educação',     icon: '📚', bucket: 'wants', pct: 7  },
    { id: 'other_ex',     name: 'Outros',       icon: '🛒', bucket: 'wants', pct: 5  },
  ]

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthTxs = txs.filter((t: any) => new Date(t.date + 'T12:00:00') >= monthStart && t.type === 'expense')

  return CATEGORIES.map(cat => {
    const spent = monthTxs
      .filter((t: any) => t.category === cat.id)
      .reduce((s: number, t: any) => s + Number(t.amount), 0) +
      fixed.filter((f: any) => f.category === cat.id && f.type === 'expense')
        .reduce((s: number, f: any) => s + Number(f.amount), 0)

    const budget = income > 0 ? income * cat.pct / 100 : 0
    const usedPct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0
    const status = usedPct >= 100 ? 'over' : usedPct >= 80 ? 'warning' : 'ok'

    return { ...cat, budget, spent, usedPct, status }
  })
}
