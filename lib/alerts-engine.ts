// Alert generation engine — runs server-side, creates alerts based on financial data

export interface AlertInput {
  userId: string
  transactions: Array<{ id: string; type: string; category: string; amount: number; date: string; name: string }>
  fixed: Array<{ id: string; type: string; category: string; amount: number; name: string }>
  goals: Array<{ id: string; name: string; target_amount: number; saved_amount: number; deadline: string | null }>
  financialProfile: { monthly_income: number; extra_income: number; savings_target_pct: number } | null
  existingAlertTypes: string[]  // alert types already created today (to avoid duplicates)
}

export interface GeneratedAlert {
  type: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  category?: string
  amount?: number
}

export function generateAlerts(input: AlertInput): GeneratedAlert[] {
  const alerts: GeneratedAlert[] = []
  const { transactions, fixed, goals, financialProfile, existingAlertTypes } = input

  const totalIncome = financialProfile
    ? (financialProfile.monthly_income || 0) + (financialProfile.extra_income || 0)
    : 0

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  // Current month transactions
  const monthTxs = transactions.filter(t =>
    new Date(t.date + 'T12:00:00') >= monthStart
  )

  const monthExpenses = monthTxs.filter(t => t.type === 'expense')
  const totalMonthExpense = monthExpenses.reduce((s, t) => s + t.amount, 0)
  const fixedExpenses = fixed.filter(f => f.type === 'expense').reduce((s, f) => s + f.amount, 0)
  const projectedExpense = fixedExpenses + totalMonthExpense
  const projectedIncome = fixedExpenses > 0 ? totalIncome : 0  // if we have fixed income data

  // ── 1. Low balance alert ─────────────────────────────────────────────────
  if (!existingAlertTypes.includes('low_balance') && totalIncome > 0) {
    const dailyBurn = totalMonthExpense / Math.max(1, dayOfMonth)
    const daysLeft = daysInMonth - dayOfMonth
    const projectedRemaining = totalIncome - projectedExpense - dailyBurn * daysLeft

    if (projectedRemaining < totalIncome * 0.05) {
      alerts.push({
        type: 'low_balance',
        severity: projectedRemaining < 0 ? 'critical' : 'warning',
        title: projectedRemaining < 0 ? 'Saldo negativo projetado!' : 'Saldo baixo no fim do mês',
        message: projectedRemaining < 0
          ? `Com base no seu ritmo atual, você vai fechar o mês ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(projectedRemaining))} negativo. Reduza gastos agora.`
          : `Seu saldo projetado para o fim do mês é baixo. Você tem ${daysLeft} dias para equilibrar as contas.`,
        amount: projectedRemaining,
      })
    }
  }

  // ── 2. Category overspend ─────────────────────────────────────────────────
  const catSpend: Record<string, number> = {}
  monthExpenses.forEach(t => {
    catSpend[t.category] = (catSpend[t.category] || 0) + t.amount
  })

  // Get last 3 months for baseline
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
  const prevTxs = transactions.filter(t =>
    new Date(t.date + 'T12:00:00') >= threeMonthsAgo &&
    new Date(t.date + 'T12:00:00') < monthStart &&
    t.type === 'expense'
  )

  const catHistory: Record<string, number[]> = {}
  prevTxs.forEach(t => {
    const m = new Date(t.date + 'T12:00:00').getMonth()
    if (!catHistory[t.category]) catHistory[t.category] = [0, 0, 0]
    const idx = 2 - ((now.getMonth() - m + 12) % 12)
    if (idx >= 0) catHistory[t.category][idx] += t.amount
  })

  Object.entries(catSpend).forEach(([cat, amount]) => {
    const history = catHistory[cat]
    if (!history) return
    const avgHistoric = history.reduce((s, v) => s + v, 0) / Math.max(1, history.filter(v => v > 0).length)
    if (avgHistoric > 0 && amount > avgHistoric * 1.5 && !existingAlertTypes.includes(`overspend_${cat}`)) {
      const CAT_NAMES: Record<string, string> = {
        food: 'Alimentação', housing: 'Moradia', transport: 'Transporte',
        health: 'Saúde', leisure: 'Lazer', education: 'Educação',
        subscription: 'Assinaturas', other_ex: 'Outros',
      }
      const catName = CAT_NAMES[cat] || cat
      const overage = amount - avgHistoric
      alerts.push({
        type: `overspend_${cat}`,
        severity: amount > avgHistoric * 2 ? 'warning' : 'info',
        title: `Gastos altos em ${catName}`,
        message: `Você já gastou ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)} em ${catName} este mês — ${Math.round((amount / avgHistoric - 1) * 100)}% acima da média. Gasto extra: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(overage)}.`,
        category: cat,
        amount: overage,
      })
    }
  })

  // ── 3. Unused subscriptions ──────────────────────────────────────────────
  const fixedSubscriptions = fixed.filter(f => f.category === 'subscription' && f.type === 'expense')
  const recentSubTxs = transactions.filter(t =>
    t.category === 'subscription' &&
    new Date(t.date + 'T12:00:00') >= new Date(now.getTime() - 45 * 86400000)
  )

  fixedSubscriptions.forEach(sub => {
    const used = recentSubTxs.some(t =>
      t.name.toLowerCase().includes(sub.name.toLowerCase().split(' ')[0])
    )
    if (!used && !existingAlertTypes.includes(`unused_sub_${sub.id}`)) {
      alerts.push({
        type: `unused_sub_${sub.id}`,
        severity: 'info',
        title: `Assinatura possivelmente não usada`,
        message: `"${sub.name}" custa ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sub.amount)}/mês e não aparece em uso nos últimos 45 dias. Considera cancelar?`,
        category: 'subscription',
        amount: sub.amount,
      })
    }
  })

  // ── 4. Goal at risk ──────────────────────────────────────────────────────
  goals.forEach(goal => {
    if (!goal.deadline || Number(goal.saved_amount) >= Number(goal.target_amount)) return
    const daysLeft = Math.ceil((new Date(goal.deadline).getTime() - now.getTime()) / 86400000)
    const remaining = Number(goal.target_amount) - Number(goal.saved_amount)
    const monthsLeft = Math.max(1, Math.ceil(daysLeft / 30))
    const neededMonthly = remaining / monthsLeft

    if (daysLeft > 0 && daysLeft < 90 && !existingAlertTypes.includes(`goal_risk_${goal.id}`)) {
      alerts.push({
        type: `goal_risk_${goal.id}`,
        severity: daysLeft < 30 ? 'critical' : 'warning',
        title: `Meta "${goal.name}" em risco`,
        message: `Faltam ${daysLeft} dias para o prazo e você ainda precisa de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(remaining)}. Precisa guardar ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(neededMonthly)}/mês para chegar lá.`,
        amount: remaining,
      })
    }
  })

  // ── 5. Savings goal achieved ─────────────────────────────────────────────
  if (totalIncome > 0 && !existingAlertTypes.includes('savings_ok')) {
    const savingsPct = totalIncome > 0 ? ((totalIncome - projectedExpense) / totalIncome) * 100 : 0
    const target = financialProfile?.savings_target_pct ?? 20

    if (savingsPct >= target && savingsPct > 0) {
      alerts.push({
        type: 'savings_ok',
        severity: 'info',
        title: `Meta de poupança atingida!`,
        message: `Você está poupando ${Math.round(savingsPct)}% da sua renda este mês — acima da sua meta de ${target}%. Continue assim! 🎉`,
        amount: totalIncome * savingsPct / 100,
      })
    }
  }

  return alerts.slice(0, 10)  // max 10 alerts per run
}
