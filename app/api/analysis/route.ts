import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10)

  const [{ data: txs }, { data: fixed }] = await Promise.all([
    supabase.from('transactions').select('*').eq('user_id', user.id)
      .gte('date', sixMonthsAgo)
      .order('date', { ascending: false }),
    supabase.from('fixed_budgets').select('*').eq('user_id', user.id).eq('active', true),
  ])

  const transactions = txs ?? []
  const fixedBudgets = fixed ?? []

  // Build monthly data for last 6 months
  const months: Array<{
    label: string
    year: number
    month: number
    income: number
    expense: number
    net: number
    byCategory: Record<string, number>
  }> = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth()
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })

    const monthTxs = transactions.filter(t => {
      const td = new Date(t.date + 'T12:00:00')
      return td.getFullYear() === y && td.getMonth() === m
    })

    const fixedInc = fixedBudgets.filter((f: any) => f.type === 'income').reduce((s: number, f: any) => s + Number(f.amount), 0)
    const fixedExp = fixedBudgets.filter((f: any) => f.type === 'expense').reduce((s: number, f: any) => s + Number(f.amount), 0)

    const varInc = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const varExp = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

    const byCategory: Record<string, number> = {}
    monthTxs.filter(t => t.type === 'expense').forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.amount)
    })
    fixedBudgets.filter((f: any) => f.type === 'expense').forEach((f: any) => {
      byCategory[f.category] = (byCategory[f.category] || 0) + Number(f.amount)
    })

    months.push({
      label,
      year: y,
      month: m,
      income:  fixedInc + varInc,
      expense: fixedExp + varExp,
      net:     (fixedInc + varInc) - (fixedExp + varExp),
      byCategory,
    })
  }

  // Category trends across months
  const allCats = Array.from(new Set(months.flatMap(m => Object.keys(m.byCategory))))
  const categoryTrends = allCats.map(cat => ({
    category: cat,
    monthly: months.map(m => ({ label: m.label, amount: m.byCategory[cat] || 0 })),
    avg: months.reduce((s, m) => s + (m.byCategory[cat] || 0), 0) / 6,
    trend: calculateTrend(months.map(m => m.byCategory[cat] || 0)),
  })).sort((a, b) => b.avg - a.avg)

  // Recurring patterns — detect regular spending
  const recurringPatterns = detectRecurring(transactions)

  // Spending peaks — day of week analysis
  const dayOfWeekSpend: number[] = [0, 0, 0, 0, 0, 0, 0]
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const dow = new Date(t.date + 'T12:00:00').getDay()
    dayOfWeekSpend[dow] += Number(t.amount)
  })

  // Current month vs previous month comparison
  const currentMonth = months[months.length - 1]
  const prevMonth = months[months.length - 2]
  const comparison = {
    income_change: prevMonth.income > 0 ? ((currentMonth.income - prevMonth.income) / prevMonth.income) * 100 : 0,
    expense_change: prevMonth.expense > 0 ? ((currentMonth.expense - prevMonth.expense) / prevMonth.expense) * 100 : 0,
    net_change: prevMonth.net !== 0 ? ((currentMonth.net - prevMonth.net) / Math.abs(prevMonth.net)) * 100 : 0,
  }

  // Waste detection
  const waste = detectWaste(transactions, fixedBudgets, months)

  return NextResponse.json({
    months,
    category_trends: categoryTrends.slice(0, 8),
    recurring_patterns: recurringPatterns,
    day_of_week_spend: dayOfWeekSpend,
    comparison,
    waste,
    insights: generateInsights(months, categoryTrends, comparison),
  })
}

function calculateTrend(values: number[]): 'up' | 'down' | 'stable' {
  const nonZero = values.filter(v => v > 0)
  if (nonZero.length < 2) return 'stable'
  const first = nonZero.slice(0, Math.floor(nonZero.length / 2)).reduce((s, v) => s + v, 0) / Math.ceil(nonZero.length / 2)
  const last  = nonZero.slice(-Math.floor(nonZero.length / 2)).reduce((s, v) => s + v, 0) / Math.floor(nonZero.length / 2)
  if (last > first * 1.1) return 'up'
  if (last < first * 0.9) return 'down'
  return 'stable'
}

function detectRecurring(transactions: any[]) {
  const nameCounts: Record<string, { count: number; total: number; avg: number; category: string }> = {}

  transactions.filter(t => t.type === 'expense').forEach(t => {
    const key = t.name.toLowerCase().trim()
    if (!nameCounts[key]) nameCounts[key] = { count: 0, total: 0, avg: 0, category: t.category }
    nameCounts[key].count++
    nameCounts[key].total += Number(t.amount)
  })

  return Object.entries(nameCounts)
    .filter(([, v]) => v.count >= 2)
    .map(([name, v]) => ({
      name,
      count: v.count,
      avg: v.total / v.count,
      total: v.total,
      category: v.category,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
}

function detectWaste(transactions: any[], fixed: any[], months: any[]) {
  const waste = []
  const BRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  // Unused subscriptions
  const subs = fixed.filter((f: any) => f.category === 'subscription' && f.type === 'expense')
  const recentSubs = transactions.filter(t =>
    t.category === 'subscription' &&
    new Date(t.date + 'T12:00:00') >= new Date(Date.now() - 60 * 86400000)
  )

  subs.forEach((sub: any) => {
    const hasRecent = recentSubs.some(t => t.name.toLowerCase().includes(sub.name.toLowerCase().split(' ')[0]))
    if (!hasRecent) {
      waste.push({
        type: 'unused_subscription',
        title: `Assinatura: ${sub.name}`,
        desc: `${BRL(sub.amount)}/mês — sem uso detectado nos últimos 60 dias`,
        amount: sub.amount,
        annual_impact: sub.amount * 12,
        action: 'Cancelar assinatura',
      })
    }
  })

  // Category spikes
  if (months.length >= 3) {
    const last = months[months.length - 1]
    const avg3 = months.slice(-4, -1)
    Object.entries(last.byCategory).forEach(([cat, amount]) => {
      const avgAmount = avg3.reduce((s, m) => s + (m.byCategory[cat] || 0), 0) / 3
      if (avgAmount > 0 && (amount as number) > avgAmount * 1.4) {
        const excess = (amount as number) - avgAmount
        const CAT_NAMES: Record<string, string> = {
          food: 'Alimentação', housing: 'Moradia', transport: 'Transporte',
          health: 'Saúde', leisure: 'Lazer', education: 'Educação',
          subscription: 'Assinaturas', other_ex: 'Outros',
        }
        waste.push({
          type: 'spending_spike',
          title: `Pico em ${CAT_NAMES[cat] || cat}`,
          desc: `${BRL(amount as number)} este mês vs ${BRL(avgAmount)} de média — excesso de ${BRL(excess)}`,
          amount: excess,
          annual_impact: excess * 12,
          action: 'Revisar gastos',
        })
      }
    })
  }

  return waste.sort((a, b) => b.annual_impact - a.annual_impact).slice(0, 6)
}

function generateInsights(months: any[], trends: any[], comparison: any) {
  const insights = []
  const BRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const current = months[months.length - 1]
  const prev = months[months.length - 2]

  if (comparison.expense_change > 20) {
    insights.push({
      icon: '📈',
      type: 'warning',
      text: `Seus gastos aumentaram ${Math.round(comparison.expense_change)}% em relação ao mês passado. Revise as categorias com maior crescimento.`,
    })
  }

  if (comparison.expense_change < -10) {
    insights.push({
      icon: '🎉',
      type: 'positive',
      text: `Seus gastos caíram ${Math.round(Math.abs(comparison.expense_change))}% vs mês passado. Ótima evolução!`,
    })
  }

  const upTrends = trends.filter(t => t.trend === 'up').slice(0, 2)
  upTrends.forEach(t => {
    const CAT_NAMES: Record<string, string> = {
      food: 'Alimentação', housing: 'Moradia', transport: 'Transporte',
      health: 'Saúde', leisure: 'Lazer', education: 'Educação',
      subscription: 'Assinaturas', other_ex: 'Outros',
    }
    insights.push({
      icon: '⚠️',
      type: 'warning',
      text: `${CAT_NAMES[t.category] || t.category} está com tendência de alta. Média: ${BRL(t.avg)}/mês nos últimos 6 meses.`,
    })
  })

  if (current.net > 0 && current.net > prev.net) {
    insights.push({
      icon: '💚',
      type: 'positive',
      text: `Você está economizando mais este mês: saldo de ${BRL(current.net)} vs ${BRL(prev.net)} no mês anterior.`,
    })
  }

  const avgSavings = months.reduce((s, m) => s + Math.max(0, m.net), 0) / 6
  if (avgSavings > 0) {
    insights.push({
      icon: '💰',
      type: 'info',
      text: `Sua média de poupança mensal nos últimos 6 meses é ${BRL(avgSavings)}. Em 12 meses, isso soma ${BRL(avgSavings * 12)}.`,
    })
  }

  return insights.slice(0, 5)
}
