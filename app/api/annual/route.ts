import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)
  const yearEnd   = new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10)

  const [{ data: txs }, { data: fixed }, { data: goals }, { data: fp }] = await Promise.all([
    supabase.from('transactions').select('*').eq('user_id', user.id)
      .gte('date', yearStart).lte('date', yearEnd).order('date'),
    supabase.from('fixed_budgets').select('*').eq('user_id', user.id).eq('active', true),
    supabase.from('goals').select('*').eq('user_id', user.id),
    supabase.from('financial_profiles').select('*').eq('user_id', user.id).single(),
  ])

  const allTxs   = txs   ?? []
  const allFixed = fixed ?? []

  const fixedIncome  = allFixed.filter((f: any) => f.type === 'income').reduce((s: number, f: any) => s + Number(f.amount), 0)
  const fixedExpense = allFixed.filter((f: any) => f.type === 'expense').reduce((s: number, f: any) => s + Number(f.amount), 0)

  const profileIncome = fp ? (fp.monthly_income || 0) + (fp.extra_income || 0) : fixedIncome

  const months = Array.from({ length: 12 }, (_, i) => {
    const monthDate  = new Date(now.getFullYear(), i, 1)
    const isPast     = i < now.getMonth()
    const isCurrent  = i === now.getMonth()
    const isFuture   = i > now.getMonth()
    const label      = monthDate.toLocaleDateString('pt-BR', { month: 'short' })
    const labelFull  = monthDate.toLocaleDateString('pt-BR', { month: 'long' })

    const monthTxs = allTxs.filter((t: any) => {
      const d = new Date(t.date + 'T12:00:00')
      return d.getFullYear() === now.getFullYear() && d.getMonth() === i
    })

    const varIncome  = monthTxs.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0)
    const varExpense = monthTxs.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0)

    const income  = isFuture ? profileIncome : fixedIncome + varIncome
    const expense = isFuture ? fixedExpense  : fixedExpense + varExpense
    const net     = income - expense
    const savingsPct = income > 0 ? Math.round((Math.max(0, net) / income) * 100) : 0

    // For current month: project based on day progress
    let projectedExpense = expense
    let projectedNet = net
    if (isCurrent) {
      const daysInMonth = new Date(now.getFullYear(), i + 1, 0).getDate()
      const daysPassed  = now.getDate()
      const dailyRate   = varExpense / Math.max(1, daysPassed)
      projectedExpense  = fixedExpense + dailyRate * daysInMonth
      projectedNet      = income - projectedExpense
    }

    return {
      month: i,
      label,
      labelFull,
      isPast,
      isCurrent,
      isFuture,
      income,
      expense,
      net,
      savingsPct,
      projectedExpense: isCurrent ? projectedExpense : undefined,
      projectedNet:     isCurrent ? projectedNet     : undefined,
    }
  })

  // Annual totals (past + current actual)
  const actualMonths   = months.filter(m => !m.isFuture)
  const totalIncome    = actualMonths.reduce((s, m) => s + m.income, 0)
  const totalExpense   = actualMonths.reduce((s, m) => s + m.expense, 0)
  const totalNet       = totalIncome - totalExpense
  const annualSavRate  = totalIncome > 0 ? Math.round((Math.max(0, totalNet) / totalIncome) * 100) : 0

  // Projected full year
  const projectedAnnualIncome  = profileIncome * 12
  const projectedAnnualExpense = fixedExpense   * 12 +
    allTxs.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0) /
    Math.max(1, now.getMonth() + 1) * 12
  const projectedAnnualNet = projectedAnnualIncome - projectedAnnualExpense

  // Goals summary
  const activeGoals = (goals ?? []).filter((g: any) => Number(g.saved_amount) < Number(g.target_amount))
  const totalGoalTarget = activeGoals.reduce((s: number, g: any) => s + Number(g.target_amount), 0)
  const totalGoalSaved  = activeGoals.reduce((s: number, g: any) => s + Number(g.saved_amount), 0)

  return NextResponse.json({
    months,
    summary: {
      totalIncome,
      totalExpense,
      totalNet,
      annualSavRate,
      projectedAnnualIncome,
      projectedAnnualExpense,
      projectedAnnualNet,
    },
    goals: {
      active: activeGoals.length,
      totalTarget: totalGoalTarget,
      totalSaved:  totalGoalSaved,
      pct: totalGoalTarget > 0 ? Math.round((totalGoalSaved / totalGoalTarget) * 100) : 0,
    },
    currentMonth: now.getMonth(),
  })
}
