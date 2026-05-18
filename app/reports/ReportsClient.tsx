'use client'
import { useState, useEffect, useCallback } from 'react'
import { BRL } from '@/lib/pulse'

interface Report {
  id: string
  period_type: string
  period_start: string
  period_end: string
  summary: {
    period: string
    income: number
    expense: number
    net: number
    savings: number
    savings_rate: number
    top_category: { name: string; amount: number } | null
    goals_at_risk: number
    health_score: number
  }
  insights: Array<{ icon: string; title: string; desc: string }>
  recommendations: Array<{ priority: string; icon: string; title: string; desc: string; action: string; href: string }>
  health_score: number
  savings_rate: number
  generated_at: string
}

function ScoreMeter({ score }: { score: number }) {
  const color = score >= 70 ? '#34C759' : score >= 40 ? '#FF9500' : '#FF3B30'
  const label = score >= 70 ? 'Ótimo' : score >= 40 ? 'Regular' : 'Atenção'
  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="70" viewBox="0 0 120 70">
        <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none" stroke="#f2f2f7" strokeWidth="12" strokeLinecap="round"/>
        <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 157} 157`}/>
        <text x="60" y="60" textAnchor="middle" fontSize="22" fontWeight="900" fontFamily="Figtree,sans-serif" fill="#1c1c1e">{score}</text>
      </svg>
      <div className="text-xs font-bold mt-1" style={{ color }}>{label}</div>
    </div>
  )
}

export default function ReportsClient() {
  const [reports, setReports]   = useState<Report[]>([])
  const [loading, setLoading]   = useState(true)
  const [generating, setGenerating] = useState(false)
  const [activeReport, setActiveReport] = useState<Report | null>(null)

  const fetchReports = useCallback(async () => {
    const res = await fetch('/api/reports')
    const json = await res.json()
    const list = json.reports ?? []
    setReports(list)
    if (list.length > 0) setActiveReport(list[0])
    setLoading(false)
  }, [])

  const generateReport = async () => {
    setGenerating(true)
    const res = await fetch('/api/reports/generate', { method: 'POST' })
    const json = await res.json()
    if (json.report) {
      await fetchReports()
    }
    setGenerating(false)
  }

  useEffect(() => { fetchReports() }, [fetchReports])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-black text-ink mb-4">Relatórios</h1>
        <div className="card p-10 text-center text-muted animate-pulse text-sm">Carregando relatórios…</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-ink">Relatórios</h1>
          <p className="text-sm text-muted mt-0.5">Insights automáticos do seu comportamento financeiro</p>
        </div>
        <button
          onClick={generateReport}
          disabled={generating}
          className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {generating ? 'Gerando…' : '+ Gerar'}
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">📊</div>
          <div className="text-base font-bold text-ink mb-2">Nenhum relatório gerado</div>
          <div className="text-sm text-muted mb-5">
            Gere seu primeiro relatório inteligente para ver insights detalhados do mês anterior.
          </div>
          <button
            onClick={generateReport}
            disabled={generating}
            className="px-6 py-3 rounded-xl bg-brand text-white text-sm font-semibold disabled:opacity-40"
          >
            {generating ? 'Gerando…' : 'Gerar relatório agora'}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Report selector */}
          {reports.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {reports.map(r => (
                <button
                  key={r.id}
                  onClick={() => setActiveReport(r)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all
                    ${activeReport?.id === r.id ? 'bg-brand text-white' : 'bg-white text-muted border border-gray-100'}`}
                >
                  {r.summary?.period ?? r.period_start}
                </button>
              ))}
            </div>
          )}

          {activeReport && (
            <>
              {/* Health score + KPIs */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-xs font-bold text-muted uppercase tracking-wider">Score de Saúde</div>
                    <div className="text-xs text-muted mt-0.5 capitalize">{activeReport.summary?.period}</div>
                  </div>
                  <ScoreMeter score={activeReport.health_score} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface rounded-xl p-3">
                    <div className="text-xs text-muted mb-0.5">Receita</div>
                    <div className="text-base font-black text-green-600">{BRL(activeReport.summary?.income ?? 0)}</div>
                  </div>
                  <div className="bg-surface rounded-xl p-3">
                    <div className="text-xs text-muted mb-0.5">Gastos</div>
                    <div className="text-base font-black text-ink">{BRL(activeReport.summary?.expense ?? 0)}</div>
                  </div>
                  <div className="bg-surface rounded-xl p-3">
                    <div className="text-xs text-muted mb-0.5">Poupança</div>
                    <div className={`text-base font-black ${(activeReport.summary?.net ?? 0) >= 0 ? 'text-brand' : 'text-red-600'}`}>
                      {BRL(activeReport.summary?.savings ?? 0)}
                    </div>
                  </div>
                  <div className="bg-surface rounded-xl p-3">
                    <div className="text-xs text-muted mb-0.5">Taxa de poupança</div>
                    <div className="text-base font-black text-brand">
                      {Math.round((activeReport.summary?.savings_rate ?? 0) * 100)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Insights */}
              {activeReport.insights?.length > 0 && (
                <div className="card p-5">
                  <div className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Insights do período</div>
                  <div className="space-y-4">
                    {activeReport.insights.map((ins, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="text-xl flex-shrink-0">{ins.icon}</span>
                        <div>
                          <div className="text-sm font-bold text-ink">{ins.title}</div>
                          <div className="text-xs text-muted mt-0.5 leading-relaxed">{ins.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CFO Automático — Recommendations */}
              {activeReport.recommendations?.length > 0 && (
                <div className="card p-5 bg-ink">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">🤖</span>
                    <div>
                      <div className="text-sm font-bold text-white">CFO Automático</div>
                      <div className="text-xs text-white/40">Recomendações personalizadas para você</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {activeReport.recommendations.map((rec, i) => (
                      <div key={i} className="border-t border-white/8 pt-4 first:border-0 first:pt-0">
                        <div className="flex gap-3 items-start">
                          <span className="text-xl flex-shrink-0">{rec.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="text-sm font-bold text-white">{rec.title}</div>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded
                                ${rec.priority === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                {rec.priority === 'high' ? 'PRIORITÁRIO' : 'SUGERIDO'}
                              </span>
                            </div>
                            <div className="text-xs text-white/55 leading-relaxed">{rec.desc}</div>
                            <a href={rec.href}
                              className="inline-block mt-2 text-xs font-bold text-brand hover:opacity-80 transition-opacity">
                              {rec.action} →
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted text-center pb-2">
                Relatório gerado em {new Date(activeReport.generated_at).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
