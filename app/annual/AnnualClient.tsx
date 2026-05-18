'use client'
import { useState, useEffect, useCallback } from 'react'
import { BRL } from '@/lib/pulse'

interface MonthData {
  month: number
  label: string
  labelFull: string
  isPast: boolean
  isCurrent: boolean
  isFuture: boolean
  income: number
  expense: number
  net: number
  savingsPct: number
  projectedExpense?: number
  projectedNet?: number
}

interface AnnualData {
  months: MonthData[]
  summary: {
    totalIncome: number
    totalExpense: number
    totalNet: number
    annualSavRate: number
    projectedAnnualIncome: number
    projectedAnnualExpense: number
    projectedAnnualNet: number
  }
  goals: { active: number; totalTarget: number; totalSaved: number; pct: number }
  currentMonth: number
}

function BarChart({ months, maxVal }: { months: MonthData[]; maxVal: number }) {
  return (
    <div className="flex items-end gap-1 h-32">
      {months.map((m, i) => {
        const incH = maxVal > 0 ? (m.income  / maxVal) * 100 : 0
        const expH = maxVal > 0 ? (m.expense / maxVal) * 100 : 0
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full flex gap-0.5 items-end" style={{ height: 112 }}>
              <div className="flex-1 rounded-t-sm transition-all" style={{ height: `${incH}%`, background: m.isFuture ? '#34C75940' : '#34C759', minHeight: m.income > 0 ? 2 : 0 }} />
              <div className="flex-1 rounded-t-sm transition-all" style={{ height: `${expH}%`, background: m.isFuture ? '#FF3B3040' : m.isCurrent ? '#FF9500' : '#FF3B30', minHeight: m.expense > 0 ? 2 : 0 }} />
            </div>
            <div className={`text-[9px] font-semibold ${m.isCurrent ? 'text-brand' : 'text-muted'}`}>{m.label}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function AnnualClient() {
  const [data,    setData]    = useState<AnnualData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const res  = await fetch('/api/annual')
    const json = await res.json()
    setData(json)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const year = new Date().getFullYear()

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-black text-ink mb-4">Visão Anual {year}</h1>
        <div className="card p-10 text-center text-muted animate-pulse text-sm">Carregando projeção anual…</div>
      </div>
    )
  }

  if (!data) return null

  const { months, summary, goals } = data
  const maxVal = Math.max(...months.map(m => Math.max(m.income, m.expense)), 1)
  const currentM = months.find(m => m.isCurrent)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-ink">Visão Anual</h1>
          <p className="text-sm text-muted mt-0.5">{year} · projeção completa</p>
        </div>
      </div>

      {/* Annual KPIs */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="card p-4">
          <div className="text-xs text-muted mb-1">Receita acumulada</div>
          <div className="text-lg font-black text-green-600">{BRL(summary.totalIncome)}</div>
          <div className="text-xs text-muted mt-0.5">Projeção: {BRL(summary.projectedAnnualIncome)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted mb-1">Gastos acumulados</div>
          <div className="text-lg font-black text-ink">{BRL(summary.totalExpense)}</div>
          <div className="text-xs text-muted mt-0.5">Projeção: {BRL(summary.projectedAnnualExpense)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted mb-1">Saldo acumulado</div>
          <div className={`text-lg font-black ${summary.totalNet >= 0 ? 'text-brand' : 'text-red-600'}`}>
            {BRL(summary.totalNet)}
          </div>
          <div className="text-xs text-muted mt-0.5">Taxa: {summary.annualSavRate}% poupado</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted mb-1">Projeção anual</div>
          <div className={`text-lg font-black ${summary.projectedAnnualNet >= 0 ? 'text-brand' : 'text-red-600'}`}>
            {BRL(summary.projectedAnnualNet)}
          </div>
          <div className="text-xs text-muted mt-0.5">até dez/{year}</div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="card p-5 mb-5">
        <div className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Receita vs Gastos — {year}</div>
        <BarChart months={months} maxVal={maxVal} />
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <div className="w-3 h-3 rounded-sm bg-green-500" /> Receita
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <div className="w-3 h-3 rounded-sm bg-red-500" /> Gastos reais
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <div className="w-3 h-3 rounded-sm bg-orange-400" /> Mês atual
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <div className="w-3 h-3 rounded-sm bg-gray-200" /> Projeção
          </div>
        </div>
      </div>

      {/* Current month spotlight */}
      {currentM && (
        <div className="card p-5 mb-5 border-2 border-brand/20">
          <div className="text-xs font-bold text-brand uppercase tracking-wider mb-3">
            {currentM.labelFull} (mês atual)
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface rounded-xl p-3 text-center">
              <div className="text-xs text-muted mb-0.5">Receita</div>
              <div className="text-sm font-black text-green-600">{BRL(currentM.income)}</div>
            </div>
            <div className="bg-surface rounded-xl p-3 text-center">
              <div className="text-xs text-muted mb-0.5">Gastos</div>
              <div className="text-sm font-black text-ink">{BRL(currentM.expense)}</div>
            </div>
            <div className="bg-surface rounded-xl p-3 text-center">
              <div className="text-xs text-muted mb-0.5">Saldo</div>
              <div className={`text-sm font-black ${currentM.net >= 0 ? 'text-brand' : 'text-red-600'}`}>
                {BRL(currentM.net)}
              </div>
            </div>
          </div>
          {currentM.projectedExpense !== undefined && (
            <div className="mt-3 bg-orange-50 rounded-xl px-3 py-2 text-xs text-orange-700">
              📊 Projeção para fechar o mês: gastos de {BRL(currentM.projectedExpense)} · saldo de {BRL(currentM.projectedNet ?? 0)}
            </div>
          )}
        </div>
      )}

      {/* Goals progress */}
      {goals.active > 0 && (
        <div className="card p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-muted uppercase tracking-wider">Metas ativas</div>
            <a href="/goals" className="text-xs font-semibold text-brand hover:opacity-70">Ver todas →</a>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs font-semibold text-muted mb-1.5">
                <span>{goals.active} meta{goals.active > 1 ? 's' : ''}</span>
                <span>{goals.pct}% do total</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${goals.pct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted mt-1.5">
                <span>Guardado: {BRL(goals.totalSaved)}</span>
                <span>Falta: {BRL(goals.totalTarget - goals.totalSaved)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Month-by-month table */}
      <div className="card p-5">
        <div className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Tabela mensal {year}</div>
        <div className="space-y-1">
          {/* Header */}
          <div className="grid grid-cols-5 gap-2 text-[10px] font-bold text-muted uppercase tracking-wider pb-2 border-b border-gray-100">
            <div>Mês</div>
            <div className="text-right">Receita</div>
            <div className="text-right">Gastos</div>
            <div className="text-right">Saldo</div>
            <div className="text-right">Poup.</div>
          </div>
          {months.map((m, i) => (
            <div
              key={i}
              className={`grid grid-cols-5 gap-2 py-2 border-b border-gray-50 last:border-0 text-xs
                ${m.isCurrent ? 'bg-brand/4 rounded-lg px-2 -mx-2 font-semibold' : ''}
                ${m.isFuture  ? 'opacity-40' : ''}`}
            >
              <div className={`font-semibold capitalize ${m.isCurrent ? 'text-brand' : 'text-ink'}`}>
                {m.isCurrent ? '▶ ' : ''}{m.label}
                {m.isFuture && <span className="text-[9px] text-muted ml-1">proj.</span>}
              </div>
              <div className="text-right text-green-600 font-semibold">{BRL(m.income)}</div>
              <div className="text-right text-ink">{BRL(m.expense)}</div>
              <div className={`text-right font-bold ${m.net >= 0 ? 'text-brand' : 'text-red-600'}`}>
                {BRL(m.net)}
              </div>
              <div className={`text-right font-bold ${m.savingsPct >= 20 ? 'text-green-600' : m.savingsPct >= 10 ? 'text-orange-500' : 'text-red-500'}`}>
                {m.savingsPct}%
              </div>
            </div>
          ))}
        </div>

        {/* Annual total row */}
        <div className="grid grid-cols-5 gap-2 pt-3 mt-1 border-t-2 border-gray-200 text-xs font-black">
          <div className="text-ink">TOTAL</div>
          <div className="text-right text-green-600">{BRL(summary.totalIncome)}</div>
          <div className="text-right text-ink">{BRL(summary.totalExpense)}</div>
          <div className={`text-right ${summary.totalNet >= 0 ? 'text-brand' : 'text-red-600'}`}>
            {BRL(summary.totalNet)}
          </div>
          <div className={`text-right ${summary.annualSavRate >= 20 ? 'text-green-600' : 'text-orange-500'}`}>
            {summary.annualSavRate}%
          </div>
        </div>
      </div>
    </div>
  )
}
