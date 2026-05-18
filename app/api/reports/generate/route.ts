import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

const BRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export async function POST() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  const [{ data: txs }, { data: fixed }, { data: goals }, { data: fp }] = await Promise.all([
    supabase.from('transactions').select('*').eq('user_id', user.id)
      .gte('date', prevMonthStart.toISOString().slice(0, 10))
      .order('date', { ascending: false }),
    supabase.from('fixed_budgets').select('*').eq('user_id', user.id).eq('active', true),
    supabase.from('goals').select('*').eq('user_id', user.id),
    supabase.from('financial_profiles').select('*').eq('user_id', user.id).single(),
  ])

  const allTxs = txs ?? []
  const allFixed = fixed ?? []

  // Previous month
  const prevTxs = allTxs.filter(t => {
    const d = new Date(t.date + 'T12:00:00')
    return d >= prevMonthStart && d <= prevMonthEnd
  })

  // Current month (MTD)
  const currTxs = allTxs.filter(t => new Date(t.date + 'T12:00:00') >= monthStart)

  const fixedInc = allFixed.filter((f: any) => f.type === 'income').reduce((s: number, f: any) => s + Number(f.amount), 0)
  const fixedExp = allFixed.filter((f: any) => f.type === 'expense').reduce((s: number, f: any) => s + Number(f.amount), 0)

  const prevIncome  = fixedInc + prevTxs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const prevExpense = fixedExp + prevTxs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const prevNet     = prevIncome - prevExpense
  const prevSavings = Math.max(0, prevNet)

  // Category breakdown for prev month
  const catSpend: Record<string, number> = {}
  prevTxs.filter(t => t.type === 'expense').forEach(t => {
    catSpend[t.category] = (catSpend[t.category] || 0) + Number(t.amount)
  })
  allFixed.filter((f: any) => f.type === 'expense').forEach((f: any) => {
    catSpend[f.category] = (catSpend[f.category] || 0) + Number(f.amount)
  })

  const topCategory = Object.entries(catSpend).sort((a, b) => (b[1] as number) - (a[1] as number))[0]

  // Goals progress
  const activeGoals = (goals ?? []).filter((g: any) => Number(g.saved_amount) < Number(g.target_amount))
  const goalsAtRisk = activeGoals.filter((g: any) => {
    if (!g.deadline) return false
    const daysLeft = Math.ceil((new Date(g.deadline).getTime() - now.getTime()) / 86400000)
    return daysLeft > 0 && daysLeft < 60
  })

  // Health score (0–100)
  const totalIncome = (fp?.monthly_income || 0) + (fp?.extra_income || 0) || prevIncome
  const savingsRate = totalIncome > 0 ? prevSavings / totalIncome : 0
  const debtPenalty = fp?.has_debt ? -10 : 0
  const emergencyBonus = fp?.has_emergency_fund ? 10 : 0
  const savingsScore = Math.min(40, Math.round(savingsRate * 200))
  const spendingScore = prevExpense < totalIncome ? 30 : Math.max(0, 30 - Math.round(((prevExpense - totalIncome) / totalIncome) * 100))
  const healthScore = Math.max(0, Math.min(100, savingsScore + spendingScore + 20 + debtPenalty + emergencyBonus))

  const CAT_NAMES: Record<string, string> = {
    food: 'Alimentação', housing: 'Moradia', transport: 'Transporte',
    health: 'Saúde', leisure: 'Lazer', education: 'Educação',
    subscription: 'Assinaturas', other_ex: 'Outros',
  }

  const summary = {
    period: prevMonthStart.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    income: prevIncome,
    expense: prevExpense,
    net: prevNet,
    savings: prevSavings,
    savings_rate: savingsRate,
    top_category: topCategory ? { name: CAT_NAMES[topCategory[0]] || topCategory[0], amount: topCategory[1] } : null,
    goals_at_risk: goalsAtRisk.length,
    health_score: healthScore,
  }

  const insights = generateInsights(summary, fp, goals ?? [])
  const recommendations = generateRecommendations(summary, fp, allFixed, catSpend)

  const report = {
    user_id: user.id,
    period_type: 'monthly' as const,
    period_start: prevMonthStart.toISOString().slice(0, 10),
    period_end: prevMonthEnd.toISOString().slice(0, 10),
    summary,
    insights,
    recommendations,
    waste_detected: [],
    health_score: healthScore,
    savings_rate: Math.round(savingsRate * 100 * 100) / 100,
  }

  const { data: saved, error } = await supabase
    .from('reports')
    .upsert(report, { onConflict: 'user_id,period_start,period_end' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ report: saved })
}

function generateInsights(summary: any, fp: any, goals: any[]) {
  const BRL_fn = BRL
  const insights = []
  const totalIncome = fp ? (fp.monthly_income || 0) + (fp.extra_income || 0) : summary.income

  insights.push({
    icon: summary.net >= 0 ? '💚' : '🔴',
    title: `Saldo de ${BRL_fn(summary.net)} em ${summary.period}`,
    desc: summary.net >= 0
      ? `Você ficou positivo! Poupou ${Math.round(summary.savings_rate * 100)}% da renda.`
      : `Suas despesas superaram a receita em ${BRL_fn(Math.abs(summary.net))}.`,
  })

  if (summary.top_category) {
    insights.push({
      icon: '📊',
      title: `Maior gasto: ${summary.top_category.name}`,
      desc: `${BRL_fn(summary.top_category.amount as number)} — ${totalIncome > 0 ? Math.round((summary.top_category.amount as number / totalIncome) * 100) : 0}% da renda.`,
    })
  }

  if (summary.goals_at_risk > 0) {
    insights.push({
      icon: '⚠️',
      title: `${summary.goals_at_risk} meta${summary.goals_at_risk > 1 ? 's' : ''} em risco`,
      desc: `Você tem metas com prazo próximo que precisam de atenção.`,
    })
  }

  insights.push({
    icon: '🏆',
    title: `Score de Saúde: ${summary.health_score}/100`,
    desc: summary.health_score >= 70
      ? 'Ótima saúde financeira! Continue assim.'
      : summary.health_score >= 40
      ? 'Saúde financeira razoável. Foco em reduzir gastos e poupar mais.'
      : 'Saúde financeira precisa de atenção. Veja as recomendações abaixo.',
  })

  return insights
}

function generateRecommendations(summary: any, fp: any, fixed: any[], catSpend: Record<string, number>) {
  const BRL_fn = BRL
  const recs = []
  const savingsPct = Math.round(summary.savings_rate * 100)
  const targetPct = fp?.savings_target_pct ?? 20

  if (savingsPct < targetPct) {
    recs.push({
      priority: 'high',
      icon: '💰',
      title: 'Aumentar taxa de poupança',
      desc: `Você poupou ${savingsPct}% mas sua meta é ${targetPct}%. Tente cortar ${BRL_fn(summary.income * (targetPct - savingsPct) / 100)} dos gastos variáveis.`,
      action: 'Ver planejamento',
      href: '/planning',
    })
  }

  if (!fp?.has_emergency_fund) {
    recs.push({
      priority: 'high',
      icon: '🛡️',
      title: 'Construir reserva de emergência',
      desc: 'Sem reserva de emergência você está vulnerável a imprevistos. Comece guardando 10% da renda em uma conta separada.',
      action: 'Criar meta',
      href: '/goals',
    })
  }

  const subs = fixed.filter((f: any) => f.category === 'subscription' && f.type === 'expense')
  const totalSubs = subs.reduce((s: number, f: any) => s + Number(f.amount), 0)
  if (totalSubs > summary.income * 0.1) {
    recs.push({
      priority: 'medium',
      icon: '📱',
      title: 'Revisar assinaturas',
      desc: `Você gasta ${BRL_fn(totalSubs)}/mês em assinaturas — ${Math.round(totalSubs / summary.income * 100)}% da renda. Cancele as que não usa.`,
      action: 'Ver análise',
      href: '/analysis',
    })
  }

  if (summary.net > 0 && !fp?.has_debt) {
    recs.push({
      priority: 'medium',
      icon: '📈',
      title: 'Investir o excedente',
      desc: `Você tem ${BRL_fn(summary.savings)} disponível. Considere investir em Tesouro Direto, CDB ou fundos de renda fixa.`,
      action: 'Explorar opções',
      href: '/market',
    })
  }

  if (fp?.has_debt && fp?.total_debt > 0) {
    recs.push({
      priority: 'high',
      icon: '💳',
      title: 'Foco em quitar dívidas',
      desc: `Com ${BRL_fn(fp.total_debt)} em dívidas, cada real pago a mais representa economia em juros. Priorize isso antes de investir.`,
      action: 'Ver perfil',
      href: '/profile',
    })
  }

  return recs
}
