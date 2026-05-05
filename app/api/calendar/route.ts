import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year  = parseInt(searchParams.get('year')  ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))

  // Date range for the requested month
  const from = `${year}-${String(month).padStart(2,'0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to   = `${year}-${String(month).padStart(2,'0')}-${lastDay}`

  // Fetch all variable transactions for this month
  const { data: txs, error } = await supabase
    .from('transactions')
    .select('id, name, type, category, amount, date')
    .eq('user_id', user.id)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch fixed budget (to compute diluted daily baseline)
  const { data: fixed } = await supabase
    .from('fixed_budgets')
    .select('type, amount')
    .eq('user_id', user.id)
    .eq('active', true)

  const fixedInc = (fixed ?? []).filter(f => f.type === 'income').reduce((s, f) => s + Number(f.amount), 0)
  const fixedExp = (fixed ?? []).filter(f => f.type === 'expense').reduce((s, f) => s + Number(f.amount), 0)
  const fixedNet = fixedInc - fixedExp
  const daysInMonth = lastDay
  const fixedPerDay = fixedNet / daysInMonth

  // Group variable transactions by day number
  const byDay: Record<number, { income: number; expense: number; txs: any[] }> = {}
  for (const tx of txs ?? []) {
    const d = parseInt(tx.date.split('-')[2])
    if (!byDay[d]) byDay[d] = { income: 0, expense: 0, txs: [] }
    if (tx.type === 'income')  byDay[d].income  += Number(tx.amount)
    else                       byDay[d].expense += Number(tx.amount)
    byDay[d].txs.push(tx)
  }

  // Build calendar days array
  const today = new Date()
  const days: any[] = []

  for (let d = 1; d <= daysInMonth; d++) {
    const dayData = byDay[d]
    const varInc  = dayData?.income  ?? 0
    const varExp  = dayData?.expense ?? 0

    // Total day balance = fixed diluted per day + variable net
    const isFuture = year > today.getFullYear()
      || (year === today.getFullYear() && month > today.getMonth() + 1)
      || (year === today.getFullYear() && month === today.getMonth() + 1 && d > today.getDate())

    const net = isFuture ? null : +(fixedPerDay + varInc - varExp).toFixed(2)

    days.push({
      day:      d,
      net,
      varInc:   +varInc.toFixed(2),
      varExp:   +varExp.toFixed(2),
      fixedNet: +fixedPerDay.toFixed(2),
      txs:      dayData?.txs ?? [],
      isFuture,
      isToday:  !isFuture && year === today.getFullYear() && month === today.getMonth() + 1 && d === today.getDate(),
    })
  }

  // Month summary
  const realDays  = days.filter(d => !d.isFuture)
  const totalVarInc = realDays.reduce((s, d) => s + d.varInc, 0)
  const totalVarExp = realDays.reduce((s, d) => s + d.varExp, 0)
  const elapsedDays = realDays.length
  const accFixedNet = fixedPerDay * elapsedDays
  const totalNet  = +(accFixedNet + totalVarInc - totalVarExp).toFixed(2)
  const posDays   = realDays.filter(d => (d.net ?? 0) > 0).length
  const negDays   = realDays.filter(d => (d.net ?? 0) < 0).length
  const txCount   = (txs ?? []).length

  return NextResponse.json({
    year, month, daysInMonth,
    days,
    summary: {
      totalNet,
      totalVarInc: +totalVarInc.toFixed(2),
      totalVarExp: +totalVarExp.toFixed(2),
      fixedInc: +fixedInc.toFixed(2),
      fixedExp: +fixedExp.toFixed(2),
      projectedInc: +(fixedInc + totalVarInc).toFixed(2),
      projectedExp: +(fixedExp + totalVarExp).toFixed(2),
      posDays, negDays, txCount,
      elapsedDays,
    }
  })
}
