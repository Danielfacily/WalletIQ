import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: goals }, { data: fp }, { data: fixed }, { data: txs }] = await Promise.all([
    supabase.from('goals').select('*').eq('user_id', user.id),
    supabase.from('financial_profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('fixed_budgets').select('*').eq('user_id', user.id).eq('active', true),
    supabase.from('transactions').select('*').eq('user_id', user.id)
      .gte('date', new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1).toISOString().slice(0, 10))
      .order('date', { ascending: false }),
  ])

  const totalIncome = fp ? (fp.monthly_income || 0) + (fp.extra_income || 0) : 0
  const fixedExpenses = (fixed || []).filter((f: any) => f.type === 'expense').reduce((s: number, f: any) => s + Number(f.amount), 0)
  const varExpenses3m = (txs || []).filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0) / 3
  const totalExpenses = fixedExpenses + varExpenses3m
  const available = Math.max(0, totalIncome - totalExpenses)

  const activeGoals = (goals || []).filter((g: any) => Number(g.saved_amount) < Number(g.target_amount))

  const suggestions = activeGoals.map((g: any) => {
    const remaining = Number(g.target_amount) - Number(g.saved_amount)
    const daysLeft = g.deadline
      ? Math.max(1, Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000))
      : null
    const monthsLeft = daysLeft ? Math.max(1, Math.ceil(daysLeft / 30)) : 12

    const suggestedMonthly = Math.ceil(remaining / monthsLeft)
    const feasible = available > 0 ? suggestedMonthly <= available * 0.5 : false
    const urgency = daysLeft !== null && daysLeft < 90 ? 'high' : daysLeft !== null && daysLeft < 180 ? 'medium' : 'low'

    return {
      goal_id: g.id,
      goal_name: g.name,
      remaining,
      months_left: monthsLeft,
      suggested_monthly: suggestedMonthly,
      feasible,
      urgency,
      tip: getTip(g, suggestedMonthly, available, monthsLeft),
    }
  })

  return NextResponse.json({
    suggestions,
    available_monthly: available,
    total_income: totalIncome,
    total_expenses: totalExpenses,
  })
}

function getTip(goal: any, monthly: number, available: number, monthsLeft: number): string {
  const progress = Number(goal.saved_amount) / Number(goal.target_amount)

  if (progress >= 0.8) return `Você está quase lá! Só falta ${Math.round((1 - progress) * 100)}% para concluir. 🎉`
  if (available <= 0) return 'Suas despesas estão acima da renda. Revise gastos para liberar espaço para essa meta.'
  if (monthly > available * 0.6) return `Esse valor mensal está alto para sua situação. Considere estender o prazo ou reduzir gastos.`
  if (monthsLeft > 24) return `Com constância, você alcança essa meta em ${monthsLeft} meses. Automatize os depósitos!`
  return `Guarde R$ ${monthly.toLocaleString('pt-BR')}/mês e você alcança essa meta no prazo! 💪`
}
