'use client'
import { useState, useEffect, useCallback } from 'react'
import { BRL } from '@/lib/pulse'

interface PlanData {
  plan: {
    needs_budget: number
    wants_budget: number
    savings_budget: number
    income_base: number
  }
  actuals: {
    needs: number
    wants: number
    savings: number
    total: number
  }
  pcts: { needs: number; wants: number; savings: number }
  categories: Array<{
    id: string
    name: string
    icon: string
    bucket: 'needs' | 'wants'
    pct: number
    budget: number
    spent: number
    usedPct: number
    status: 'ok' | 'warning' | 'over'
  }>
  total_income: number
  has_profile: boolean
}

const BUCKET_INFO = {
  needs: { label: 'Necessidades',  color: '#007AFF', bgColor: 'bg-blue-50',   textColor: 'text-blue-700',   desc: 'Moradia, alimentação, saúde, transporte' },
  wants: { label: 'Qualidade de Vida', color: '#AF52DE', bgColor: 'bg-purple-50', textColor: 'text-purple-700', desc: 'Lazer, assinaturas, educação' },
  savings: { label: 'Poupança/Metas', color: '#34C759', bgColor: 'bg-green-50',  textColor: 'text-green-700',  desc: 'Investimentos, metas, reserva de emergência' },
}

function StatusBar({ spent, budget, color }: { spent: number; budget: number; color: string }) {
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0
  const isOver = spent > budget
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: isOver ? '#FF3B30' : pct >= 80 ? '#FF9500' : color }}
      />
    </div>
  )
}

export default function PlanningClient() {
  const [data, setData]       = useState<PlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [customPcts, setCustomPcts] = useState({ needs: 50, wants: 30, savings: 20 })

  const fetchPlan = useCallback(async () => {
    const res = await fetch('/api/planning')
    const json = await res.json()
    setData(json)
    if (json.pcts) setCustomPcts(json.pcts)
    setLoading(false)
  }, [])

  useEffect(() => { fetchPlan() }, [fetchPlan])

  const savePlan = async () => {
    if (!data) return
    setSaving(true)
    const income = data.total_income
    await fetch('/api/planning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        income_base:    income,
        needs_budget:   income * customPcts.needs / 100,
        wants_budget:   income * customPcts.wants / 100,
        savings_budget: income * customPcts.savings / 100,
        auto_generated: false,
      }),
    })
    await fetchPlan()
    setSaving(false)
    setEditMode(false)
  }

  const now = new Date()
  const monthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthProgress = Math.round((dayOfMonth / daysInMonth) * 100)

  if (loading) {
    return <div className="p-6 max-w-2xl mx-auto card p-10 text-center text-muted animate-pulse text-sm">Carregando plano…</div>
  }

  if (!data?.has_profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-black text-ink mb-4">Planejamento</h1>
        <div className="card p-8 text-center">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-base font-bold text-ink mb-2">Complete seu perfil financeiro</div>
          <div className="text-sm text-muted mb-4">
            Para gerar seu plano 50/30/20 personalizado, precisamos saber sua renda mensal.
          </div>
          <a href="/profile" className="inline-block px-6 py-3 rounded-xl bg-brand text-white text-sm font-semibold">
            Configurar perfil →
          </a>
        </div>
      </div>
    )
  }

  const { plan, actuals, categories } = data!
  const income = data.total_income

  const needsRemainder  = plan.needs_budget - actuals.needs
  const wantsRemainder  = plan.wants_budget - actuals.wants
  const savingsActual   = Math.max(0, income - actuals.needs - actuals.wants)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-ink">Planejamento</h1>
          <p className="text-sm text-muted capitalize mt-0.5">{monthName}</p>
        </div>
        <button
          onClick={() => setEditMode(!editMode)}
          className="text-sm font-semibold text-brand hover:opacity-70 transition-opacity"
        >
          {editMode ? 'Cancelar' : '⚙️ Ajustar'}
        </button>
      </div>

      {/* Month progress */}
      <div className="card p-4 mb-5">
        <div className="flex justify-between items-center mb-2">
          <div className="text-xs font-bold text-muted uppercase tracking-wider">Progresso do mês</div>
          <div className="text-xs font-bold text-brand">{monthProgress}%</div>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${monthProgress}%` }} />
        </div>
        <div className="flex justify-between text-xs text-muted mt-1.5">
          <span>Dia {dayOfMonth}</span>
          <span>{daysInMonth - dayOfMonth} dias restantes</span>
        </div>
      </div>

      {/* Edit mode — customize percentages */}
      {editMode && (
        <div className="card p-5 mb-5 border-2 border-brand/20">
          <div className="text-sm font-bold text-ink mb-4">Personalizar distribuição</div>
          {(['needs', 'wants', 'savings'] as const).map(bucket => {
            const info = BUCKET_INFO[bucket]
            return (
              <div key={bucket} className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-ink">{info.label}</span>
                  <span className="text-sm font-black" style={{ color: info.color }}>{customPcts[bucket]}%</span>
                </div>
                <input
                  type="range" min="5" max="70" step="5"
                  className="w-full"
                  style={{ accentColor: info.color }}
                  value={customPcts[bucket]}
                  onChange={e => {
                    const val = Number(e.target.value)
                    const others = (['needs', 'wants', 'savings'] as const).filter(b => b !== bucket)
                    const remaining = 100 - val
                    const totalOthers = customPcts[others[0]] + customPcts[others[1]]
                    if (totalOthers > 0) {
                      setCustomPcts(prev => ({
                        ...prev,
                        [bucket]: val,
                        [others[0]]: Math.round(remaining * prev[others[0]] / totalOthers),
                        [others[1]]: 100 - val - Math.round(remaining * prev[others[0]] / totalOthers),
                      }))
                    }
                  }}
                />
                <div className="text-xs text-muted">{info.desc}</div>
                {income > 0 && (
                  <div className="text-xs font-bold mt-0.5" style={{ color: info.color }}>
                    = {BRL(income * customPcts[bucket] / 100)}/mês
                  </div>
                )}
              </div>
            )
          })}
          <div className={`text-sm font-bold text-center mt-2 ${customPcts.needs + customPcts.wants + customPcts.savings === 100 ? 'text-green-600' : 'text-red-600'}`}>
            Total: {customPcts.needs + customPcts.wants + customPcts.savings}% {customPcts.needs + customPcts.wants + customPcts.savings !== 100 ? '(deve ser 100%)' : '✓'}
          </div>
          <button
            onClick={savePlan}
            disabled={saving || customPcts.needs + customPcts.wants + customPcts.savings !== 100}
            className="w-full mt-4 py-3 rounded-xl bg-brand text-white text-sm font-semibold disabled:opacity-40"
          >
            {saving ? 'Salvando…' : 'Salvar plano personalizado'}
          </button>
        </div>
      )}

      {/* 3 buckets overview */}
      <div className="space-y-4 mb-6">
        {([
          { bucket: 'needs',   spent: actuals.needs,   budget: plan.needs_budget,   rem: needsRemainder },
          { bucket: 'wants',   spent: actuals.wants,   budget: plan.wants_budget,   rem: wantsRemainder },
          { bucket: 'savings', spent: savingsActual,   budget: plan.savings_budget, rem: plan.savings_budget - savingsActual },
        ] as const).map(({ bucket, spent, budget, rem }) => {
          const info = BUCKET_INFO[bucket]
          const usedPct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0
          const isOver = spent > budget
          return (
            <div key={bucket} className={`card p-5`}>
              <div className="flex items-start justify-between mb-1">
                <div>
                  <div className="font-bold text-ink">{info.label}</div>
                  <div className="text-xs text-muted mt-0.5">{info.desc}</div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-black ${isOver ? 'text-red-600' : 'text-ink'}`}>
                    {BRL(spent)}
                  </div>
                  <div className="text-xs text-muted">de {BRL(budget)}</div>
                </div>
              </div>
              <StatusBar spent={spent} budget={budget} color={info.color} />
              <div className="flex justify-between items-center mt-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${info.bgColor} ${info.textColor}`}>
                  {usedPct}% usado
                </span>
                <span className={`text-xs font-semibold ${isOver ? 'text-red-600' : 'text-muted'}`}>
                  {isOver ? `⚠️ ${BRL(Math.abs(rem))} acima` : `${BRL(rem)} disponível`}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Category breakdown */}
      <div className="text-base font-black text-ink mb-3">Por categoria</div>
      <div className="space-y-2">
        {categories.map(cat => (
          <div key={cat.id} className="card px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-xl w-8 text-center">{cat.icon}</span>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-ink">{cat.name}</span>
                  <span className={`text-sm font-bold ${cat.status === 'over' ? 'text-red-600' : cat.status === 'warning' ? 'text-orange-600' : 'text-ink'}`}>
                    {BRL(cat.spent)}
                    <span className="text-xs text-muted font-normal"> / {BRL(cat.budget)}</span>
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${cat.usedPct}%`,
                      background: cat.status === 'over' ? '#FF3B30' : cat.status === 'warning' ? '#FF9500' : '#007AFF',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CFO tip */}
      {data && (
        <div className="mt-6 card p-5 bg-ink">
          <div className="flex gap-3 items-start">
            <span className="text-2xl flex-shrink-0">🤖</span>
            <div>
              <div className="text-sm font-bold text-white mb-1">CFO Automático</div>
              <div className="text-sm text-white/70 leading-relaxed">
                {generateCFOTip(data)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function generateCFOTip(data: PlanData): string {
  const { actuals, plan, categories } = data
  const overCats = categories.filter(c => c.status === 'over')
  const warnCats = categories.filter(c => c.status === 'warning')

  if (overCats.length > 0) {
    return `Atenção: você já passou do limite em ${overCats.map(c => c.name).join(' e ')}. Revise esses gastos para não comprometer suas metas do mês.`
  }
  if (warnCats.length > 0) {
    return `Você está próximo do limite em ${warnCats.map(c => c.name).join(' e ')}. Fique atento para não ultrapassar o orçamento planejado.`
  }
  if (actuals.savings > plan.savings_budget * 0.5) {
    return `Excelente! Você já garantiu ${BRL(actuals.savings)} para poupança este mês. Continue no ritmo e vai superar sua meta!`
  }
  return `Seu planejamento está equilibrado. Mantenha o ritmo de gastos atual e você fecha o mês dentro do orçamento.`
}
