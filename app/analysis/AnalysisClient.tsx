'use client'
import { useState, useEffect, useCallback } from 'react'
import { BRL } from '@/lib/pulse'

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const CAT_NAMES: Record<string, { name: string; icon: string; color: string }> = {
  food:         { name: 'Alimentação', icon: '🍔', color: '#FF9500' },
  housing:      { name: 'Moradia',     icon: '🏠', color: '#007AFF' },
  transport:    { name: 'Transporte',  icon: '🚗', color: '#34C759' },
  health:       { name: 'Saúde',       icon: '💊', color: '#FF2D55' },
  leisure:      { name: 'Lazer',       icon: '🎮', color: '#AF52DE' },
  education:    { name: 'Educação',    icon: '📚', color: '#5AC8FA' },
  subscription: { name: 'Assinaturas',icon: '📱', color: '#FF3B30' },
  other_ex:     { name: 'Outros',      icon: '🛒', color: '#8E8E93' },
}

interface AnalysisData {
  months: Array<{ label: string; income: number; expense: number; net: number }>
  category_trends: Array<{ category: string; monthly: Array<{ label: string; amount: number }>; avg: number; trend: string }>
  day_of_week_spend: number[]
  comparison: { income_change: number; expense_change: number; net_change: number }
  waste: Array<{ type: string; title: string; desc: string; amount: number; annual_impact: number; action: string }>
  insights: Array<{ icon: string; type: string; text: string }>
  recurring_patterns: Array<{ name: string; count: number; avg: number; total: number; category: string }>
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-16 flex flex-col justify-end">
      <div className="w-full rounded-t-sm" style={{ height: `${pct}%`, background: color, minHeight: pct > 0 ? 4 : 0 }} />
    </div>
  )
}

export default function AnalysisClient() {
  const [data, setData]       = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<'overview' | 'categories' | 'waste' | 'patterns'>('overview')

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/analysis')
    const json = await res.json()
    setData(json)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-black text-ink mb-4">Análise</h1>
        <div className="card p-10 text-center text-muted animate-pulse text-sm">Analisando comportamento financeiro…</div>
      </div>
    )
  }

  if (!data || !data.months.length) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-black text-ink mb-4">Análise</h1>
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">📊</div>
          <div className="text-base font-bold text-ink mb-2">Dados insuficientes</div>
          <div className="text-sm text-muted">Adicione transações para ver sua análise de comportamento financeiro.</div>
        </div>
      </div>
    )
  }

  const maxBarVal = Math.max(...data.months.flatMap(m => [m.income, m.expense]))
  const maxDow = Math.max(...data.day_of_week_spend)

  const { comparison } = data

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink">Análise</h1>
        <p className="text-sm text-muted mt-0.5">Comportamento financeiro dos últimos 6 meses</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-fill rounded-xl p-1 mb-5 overflow-x-auto">
        {([
          { k: 'overview',   l: 'Visão Geral' },
          { k: 'categories', l: 'Categorias' },
          { k: 'waste',      l: '🔍 Desperdício' },
          { k: 'patterns',   l: 'Padrões' },
        ] as const).map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`flex-shrink-0 flex-1 py-2 px-3 rounded-[10px] text-sm font-semibold transition-all
              ${tab === t.k ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="space-y-5">
          {/* Month comparison */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Receita', change: comparison.income_change,  positive: comparison.income_change >= 0 },
              { label: 'Gastos',  change: comparison.expense_change, positive: comparison.expense_change <= 0 },
              { label: 'Saldo',   change: comparison.net_change,     positive: comparison.net_change >= 0 },
            ].map(item => (
              <div key={item.label} className="card p-4 text-center">
                <div className="text-xs text-muted mb-1">{item.label}</div>
                <div className={`text-base font-black ${item.positive ? 'text-green-600' : 'text-red-600'}`}>
                  {item.change >= 0 ? '+' : ''}{Math.round(item.change)}%
                </div>
                <div className="text-[10px] text-muted mt-0.5">vs mês ant.</div>
              </div>
            ))}
          </div>

          {/* 6-month bar chart */}
          <div className="card p-5">
            <div className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Evolução 6 meses</div>
            <div className="flex items-end gap-2 h-20 mb-2">
              {data.months.map((m, i) => (
                <div key={i} className="flex-1 flex gap-0.5 items-end h-full">
                  <MiniBar value={m.income}  max={maxBarVal} color="#34C759" />
                  <MiniBar value={m.expense} max={maxBarVal} color="#FF3B30" />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              {data.months.map((m, i) => (
                <div key={i} className="flex-1 text-center text-[10px] text-muted">{m.label}</div>
              ))}
            </div>
            <div className="flex gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-xs text-muted"><div className="w-3 h-3 rounded-sm bg-green-500"/> Receita</div>
              <div className="flex items-center gap-1.5 text-xs text-muted"><div className="w-3 h-3 rounded-sm bg-red-500"/> Gastos</div>
            </div>
          </div>

          {/* Net balance trend */}
          <div className="card p-5">
            <div className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Saldo mensal</div>
            {data.months.map((m, i) => (
              <div key={i} className="flex items-center gap-3 mb-2">
                <div className="w-10 text-[11px] text-muted flex-shrink-0">{m.label}</div>
                <div className="flex-1 h-4 bg-gray-50 rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all"
                    style={{
                      width: `${Math.abs(m.net) / (Math.max(...data.months.map(x => Math.abs(x.net))) || 1) * 100}%`,
                      background: m.net >= 0 ? '#34C759' : '#FF3B30',
                    }}
                  />
                </div>
                <div className={`text-xs font-bold w-20 text-right flex-shrink-0 ${m.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {m.net >= 0 ? '+' : ''}{BRL(m.net)}
                </div>
              </div>
            ))}
          </div>

          {/* Insights */}
          {data.insights.length > 0 && (
            <div className="card p-5">
              <div className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Insights inteligentes</div>
              <div className="space-y-3">
                {data.insights.map((ins, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="text-lg flex-shrink-0">{ins.icon}</span>
                    <p className="text-sm text-ink leading-relaxed">{ins.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Day of week */}
          <div className="card p-5">
            <div className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Gastos por dia da semana</div>
            <div className="flex items-end gap-2 h-16">
              {data.day_of_week_spend.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-sm bg-brand/20 flex flex-col justify-end overflow-hidden"
                    style={{ height: 48 }}>
                    <div
                      className="w-full rounded-t-sm bg-brand"
                      style={{ height: maxDow > 0 ? `${(v / maxDow) * 100}%` : 0 }}
                    />
                  </div>
                  <div className="text-[10px] text-muted">{DAYS_PT[i]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CATEGORIES ── */}
      {tab === 'categories' && (
        <div className="space-y-4">
          {data.category_trends.map(ct => {
            const info = CAT_NAMES[ct.category] ?? { name: ct.category, icon: '•', color: '#8E8E93' }
            const maxVal = Math.max(...ct.monthly.map(m => m.amount))
            return (
              <div key={ct.category} className="card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                    style={{ background: `${info.color}18` }}>
                    {info.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold text-ink">{info.name}</div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded
                        ${ct.trend === 'up' ? 'bg-red-100 text-red-700' : ct.trend === 'down' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-muted'}`}>
                        {ct.trend === 'up' ? '↑ Alta' : ct.trend === 'down' ? '↓ Queda' : '→ Estável'}
                      </span>
                    </div>
                    <div className="text-xs text-muted">Média: {BRL(ct.avg)}/mês</div>
                  </div>
                </div>
                {/* Mini sparkline */}
                <div className="flex items-end gap-1 h-10">
                  {ct.monthly.map((m, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="w-full rounded-sm" style={{
                        height: maxVal > 0 ? `${Math.max(4, (m.amount / maxVal) * 36)}px` : 4,
                        background: info.color,
                        opacity: 0.3 + (i / ct.monthly.length) * 0.7,
                      }} />
                      <div className="text-[8px] text-muted">{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── WASTE DETECTOR ── */}
      {tab === 'waste' && (
        <div className="space-y-4">
          <div className="card p-4 bg-orange-50 border border-orange-100">
            <div className="text-sm font-bold text-orange-700 mb-1">🔍 Detector de Desperdício</div>
            <div className="text-xs text-orange-600">
              Analisamos seus gastos para identificar possíveis desperdícios. Revise e tome ação!
            </div>
          </div>

          {data.waste.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-sm font-bold text-ink">Nenhum desperdício detectado!</div>
              <div className="text-xs text-muted mt-1">Seus gastos estão dentro do padrão normal.</div>
            </div>
          ) : (
            <>
              <div className="card p-4 text-center">
                <div className="text-xs text-muted mb-1">Impacto anual estimado</div>
                <div className="text-2xl font-black text-red-600">
                  {BRL(data.waste.reduce((s, w) => s + w.annual_impact, 0))}
                </div>
                <div className="text-xs text-muted mt-0.5">em desperdícios potenciais</div>
              </div>

              {data.waste.map((w, i) => (
                <div key={i} className="card p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-sm font-bold text-ink">{w.title}</div>
                    <div className="text-sm font-black text-red-600">{BRL(w.amount)}</div>
                  </div>
                  <div className="text-xs text-muted mb-3">{w.desc}</div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted">
                      Impacto anual: <span className="font-bold text-red-600">{BRL(w.annual_impact)}</span>
                    </div>
                    <div className="text-xs font-bold text-brand">{w.action} →</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── PATTERNS ── */}
      {tab === 'patterns' && (
        <div className="space-y-4">
          <div className="card p-5">
            <div className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Gastos recorrentes</div>
            {data.recurring_patterns.length === 0 ? (
              <div className="text-sm text-muted text-center py-4">Nenhum padrão identificado ainda.</div>
            ) : (
              data.recurring_patterns.map((p, i) => {
                const info = CAT_NAMES[p.category] ?? { icon: '•', name: p.category, color: '#8E8E93' }
                return (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <span className="text-lg w-8 text-center">{info.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-ink capitalize truncate">{p.name}</div>
                      <div className="text-xs text-muted">{p.count}× · média {BRL(p.avg)}</div>
                    </div>
                    <div className="text-sm font-bold text-ink text-right">
                      {BRL(p.total)}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
