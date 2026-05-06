'use client'
import { useState, useEffect, useCallback } from 'react'

interface Goal {
  id: string
  name: string
  emoji: string
  target_amount: number
  saved_amount: number
  deadline: string | null
  category: string
  monthly_target: number | null
  priority: number
}

interface GoalSuggestion {
  goal_id: string
  goal_name: string
  remaining: number
  months_left: number
  suggested_monthly: number
  feasible: boolean
  urgency: 'low' | 'medium' | 'high'
  tip: string
}

const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const EMOJIS = ['🎯','🏠','🚗','✈️','📱','💍','🎓','💊','🐕','🎮','🏋️','🌊','🎸','👶','💼','🌅','🛡️','💻']

const GOAL_CATEGORIES = [
  { id: 'emergencia',    icon: '🛡️', label: 'Emergência',     color: '#FF9500' },
  { id: 'viagem',        icon: '✈️', label: 'Viagem',          color: '#007AFF' },
  { id: 'imovel',        icon: '🏠', label: 'Imóvel',          color: '#34C759' },
  { id: 'veiculo',       icon: '🚗', label: 'Veículo',         color: '#5AC8FA' },
  { id: 'aposentadoria', icon: '🌅', label: 'Aposentadoria',   color: '#AF52DE' },
  { id: 'educacao',      icon: '🎓', label: 'Educação',        color: '#FF2D55' },
  { id: 'saude',         icon: '💊', label: 'Saúde',           color: '#FF3B30' },
  { id: 'outro',         icon: '🎯', label: 'Outro',           color: '#8E8E93' },
]

function pct(saved: number, target: number) {
  return Math.min(100, Math.round((saved / target) * 100))
}

function daysLeft(deadline: string | null) {
  if (!deadline) return null
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
}

function urgencyColor(urgency: string) {
  if (urgency === 'high') return '#FF3B30'
  if (urgency === 'medium') return '#FF9500'
  return '#34C759'
}

export default function GoalsClient() {
  const [goals,       setGoals]       = useState<Goal[]>([])
  const [suggestions, setSuggestions] = useState<GoalSuggestion[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showAdd,     setShowAdd]     = useState(false)
  const [depositGoal, setDepositGoal] = useState<Goal | null>(null)
  const [depositVal,  setDepositVal]  = useState('')
  const [activeGoal,  setActiveGoal]  = useState<Goal | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [availableMonthly, setAvailableMonthly] = useState(0)
  const [totalIncome, setTotalIncome] = useState(0)
  const [hasDebt, setHasDebt]         = useState(false)
  const [consulting,   setConsulting]  = useState(false)
  const [consultation, setConsultation] = useState<any | null>(null)

  const [form, setForm] = useState({
    name: '', emoji: '🎯', target_amount: '', deadline: '', category: 'outro', priority: 1
  })

  const fetchGoals = useCallback(async () => {
    const [goalsRes, suggestRes] = await Promise.all([
      fetch('/api/goals'),
      fetch('/api/goals/suggest'),
    ])
    const goalsJson   = await goalsRes.json()
    const suggestJson = await suggestRes.json()
    setGoals(goalsJson.goals ?? [])
    setSuggestions(suggestJson.suggestions ?? [])
    setAvailableMonthly(suggestJson.available_monthly ?? 0)
    setTotalIncome(suggestJson.total_income ?? 0)
    setLoading(false)
  }, [])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  const createGoal = async () => {
    if (!form.name || !form.target_amount) { setError('Preencha nome e valor alvo'); return }
    setSaving(true); setError(null)
    const res  = await fetch('/api/goals', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        ...form,
        target_amount: Number(form.target_amount),
        category: form.category,
        priority: form.priority,
      }),
    })
    const json = await res.json()
    if (json.error) { setError(json.error); setSaving(false); return }
    setShowAdd(false)
    setConsultation(null)
    setForm({ name: '', emoji: '🎯', target_amount: '', deadline: '', category: 'outro', priority: 1 })
    setSaving(false)
    await fetchGoals()
  }

  const consultGoal = async () => {
    if (!form.name || !form.target_amount) { setError('Preencha nome e valor para consultar'); return }
    setConsulting(true); setError(null); setConsultation(null)
    const res = await fetch('/api/goals/consult', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal_name: form.name,
        goal_category: form.category,
        target_amount: Number(form.target_amount),
        deadline: form.deadline || null,
        available_monthly: availableMonthly,
        monthly_income: totalIncome,
        has_debt: hasDebt,
      }),
    })
    const json = await res.json()
    setConsultation(json)
    setConsulting(false)
  }

  const addDeposit = async () => {
    if (!depositGoal || !depositVal) return
    setSaving(true)
    const newSaved = Number(depositGoal.saved_amount) + Number(depositVal)
    await fetch(`/api/goals/${depositGoal.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ saved_amount: newSaved }),
    })
    setDepositGoal(null); setDepositVal(''); setSaving(false)
    await fetchGoals()
  }

  const deleteGoal = async (id: string) => {
    await fetch(`/api/goals/${id}`, { method: 'DELETE' })
    setActiveGoal(null)
    await fetchGoals()
  }

  const completed = goals.filter(g => Number(g.saved_amount) >= Number(g.target_amount))
  const active    = goals.filter(g => Number(g.saved_amount) <  Number(g.target_amount))
    .sort((a, b) => (a.priority || 1) - (b.priority || 1))

  const totalSaved  = goals.reduce((s, g) => s + Number(g.saved_amount), 0)
  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0)
  const overallPct  = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0

  const getSuggestion = (goalId: string) => suggestions.find(s => s.goal_id === goalId)

  const formTarget = Number(form.target_amount) || 0
  const formDeadline = form.deadline
  const monthsUntilDeadline = formDeadline
    ? Math.max(1, Math.ceil((new Date(formDeadline).getTime() - Date.now()) / (30 * 86400000)))
    : 12
  const suggestedMonthly = formTarget > 0 ? Math.ceil(formTarget / monthsUntilDeadline) : 0

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-ink">Objetivos</h1>
          <p className="text-sm text-muted mt-0.5">Suas metas financeiras inteligentes</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setError(null) }}
          className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          + Nova meta
        </button>
      </div>

      {/* Summary */}
      {goals.length > 0 && (
        <div className="card p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-muted uppercase tracking-wider">Visão geral</div>
            <div className="text-sm font-black text-brand">{overallPct}% do total</div>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div
              className="h-full rounded-full bg-brand transition-all duration-700"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-xl font-black text-ink">{goals.length}</div>
              <div className="text-[11px] text-muted mt-0.5">Metas</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-black text-green-600">{BRL(totalSaved)}</div>
              <div className="text-[11px] text-muted mt-0.5">Guardado</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-black text-muted">{BRL(totalTarget - totalSaved)}</div>
              <div className="text-[11px] text-muted mt-0.5">Falta</div>
            </div>
          </div>
          {availableMonthly > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-50">
              <div className="text-xs text-muted">
                Você tem <span className="font-bold text-green-600">{BRL(availableMonthly)}</span> disponível/mês para investir nas suas metas
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="card p-10 text-center text-muted animate-pulse text-sm">Carregando…</div>
      ) : goals.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">🎯</div>
          <div className="text-base font-bold text-ink mb-1">Nenhuma meta criada</div>
          <div className="text-sm text-muted mb-4">
            Crie sua primeira meta e o WalletIQ vai te ajudar a alcançá-la com um plano personalizado.
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="px-6 py-3 rounded-xl bg-brand text-white text-sm font-semibold"
          >
            Criar minha primeira meta
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {active.map(g => {
            const p    = pct(Number(g.saved_amount), Number(g.target_amount))
            const days = daysLeft(g.deadline)
            const sugg = getSuggestion(g.id)
            const cat  = GOAL_CATEGORIES.find(c => c.id === g.category) ?? GOAL_CATEGORIES[7]

            return (
              <div
                key={g.id}
                className="card p-5 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setActiveGoal(activeGoal?.id === g.id ? null : g)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ background: `${cat.color}18` }}>
                      {g.emoji}
                    </div>
                    <div>
                      <div className="font-bold text-ink">{g.name}</div>
                      <div className="text-xs text-muted flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                          style={{ background: `${cat.color}18`, color: cat.color }}>
                          {cat.label}
                        </span>
                        {days !== null && (
                          <span className={days < 0 ? 'text-red-500' : days < 30 ? 'text-yellow-600' : 'text-muted'}>
                            {days < 0 ? `${Math.abs(days)}d atrasado` : `${days}d restantes`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { setDepositGoal(g); setDepositVal('') }}
                      className="text-xs font-semibold text-brand hover:opacity-70 transition-opacity px-2 py-1 rounded-lg bg-brand/10"
                    >
                      + Depositar
                    </button>
                  </div>
                </div>

                {/* Amount & progress */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-sm font-black text-ink">{BRL(Number(g.saved_amount))}</div>
                  <div className="text-xs text-muted">de {BRL(Number(g.target_amount))}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${p}%`, background: p >= 80 ? '#34C759' : p >= 40 ? '#007AFF' : '#FF9500' }}
                    />
                  </div>
                  <span className="text-xs font-bold text-brand w-10 text-right">{p}%</span>
                </div>

                {/* Smart insight */}
                {sugg && (
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                        style={{ background: urgencyColor(sugg.urgency) }} />
                      <div className="text-xs text-muted leading-relaxed">{sugg.tip}</div>
                    </div>
                    {sugg.suggested_monthly > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[11px] text-muted">Sugestão mensal:</span>
                        <span className="text-xs font-black text-brand">{BRL(sugg.suggested_monthly)}</span>
                        <span className="text-[11px] text-muted">por {sugg.months_left} meses</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Expanded detail */}
                {activeGoal?.id === g.id && (
                  <div className="mt-3 pt-3 border-t border-gray-50 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-surface rounded-xl p-3">
                        <div className="text-[10px] text-muted mb-0.5">Falta guardar</div>
                        <div className="text-sm font-black text-ink">
                          {BRL(Number(g.target_amount) - Number(g.saved_amount))}
                        </div>
                      </div>
                      {sugg && (
                        <div className="bg-brand/8 rounded-xl p-3">
                          <div className="text-[10px] text-brand mb-0.5">Valor/mês sugerido</div>
                          <div className="text-sm font-black text-brand">{BRL(sugg.suggested_monthly)}</div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); deleteGoal(g.id) }}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors w-full text-center py-2"
                    >
                      Excluir meta
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {completed.length > 0 && (
            <>
              <div className="text-xs font-bold text-muted uppercase tracking-wider mt-6 mb-2 px-1">
                ✅ Concluídas
              </div>
              {completed.map(g => (
                <div key={g.id} className="card p-5 opacity-60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-2xl">{g.emoji}</div>
                      <div>
                        <div className="font-bold text-ink line-through">{g.name}</div>
                        <div className="text-xs text-green-600 font-semibold">Meta atingida! {BRL(Number(g.target_amount))}</div>
                      </div>
                    </div>
                    <button onClick={() => deleteGoal(g.id)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Modal: Nova meta */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="text-lg font-black text-ink">Nova meta</div>

            {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</div>}

            {/* Category picker */}
            <div>
              <div className="text-xs text-muted mb-2">Categoria</div>
              <div className="grid grid-cols-4 gap-2">
                {GOAL_CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setForm(f => ({ ...f, category: c.id }))}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all
                      ${form.category === c.id ? 'border-brand bg-brand/8' : 'border-gray-100 hover:border-gray-200'}`}>
                    <span className="text-xl">{c.icon}</span>
                    <span className="text-[10px] font-semibold text-muted">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Emoji picker */}
            <div>
              <div className="text-xs text-muted mb-2">Ícone</div>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))}
                    className={`text-2xl p-1.5 rounded-xl transition-all ${form.emoji === e ? 'bg-brand/20 scale-110' : 'hover:bg-gray-100'}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-muted">Nome da meta</label>
              <input
                className="input mt-1" placeholder="Ex: Viagem para Europa"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs text-muted">Valor alvo (R$)</label>
              <input
                className="input mt-1" type="number" placeholder="0,00"
                value={form.target_amount}
                onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs text-muted">Prazo (opcional)</label>
              <input
                className="input mt-1" type="date"
                value={form.deadline}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              />
            </div>

            {/* Smart suggestion preview */}
            {suggestedMonthly > 0 && (
              <div className="bg-brand/8 rounded-xl p-3">
                <div className="text-xs font-bold text-brand mb-1">Sugestão rápida</div>
                <div className="text-sm text-brand">
                  Guarde <span className="font-black">{BRL(suggestedMonthly)}/mês</span> por {monthsUntilDeadline} meses para alcançar essa meta.
                </div>
                {availableMonthly > 0 && suggestedMonthly > availableMonthly * 0.5 && (
                  <div className="text-xs text-orange-600 mt-1">
                    ⚠️ Isso representa mais de 50% do seu saldo disponível. Considere estender o prazo.
                  </div>
                )}
              </div>
            )}

            {/* AI Consultant */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="text-xs text-muted">Possui dívidas?</div>
                <button onClick={() => setHasDebt(h => !h)}
                  className={`text-xs font-semibold px-3 py-1 rounded-full border-2 transition-all
                    ${hasDebt ? 'border-orange-400 bg-orange-50 text-orange-600' : 'border-gray-200 text-muted'}`}>
                  {hasDebt ? 'Sim' : 'Não'}
                </button>
              </div>
              <button
                onClick={consultGoal}
                disabled={consulting || !form.name || !form.target_amount}
                className="w-full py-2.5 rounded-xl border-2 border-brand/30 bg-brand/5 text-brand text-sm font-semibold
                  hover:bg-brand/10 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              >
                {consulting ? (
                  <><span className="animate-spin text-base">⟳</span> Consultando CFO…</>
                ) : (
                  <><span>🤖</span> Consultar CFO Automático</>
                )}
              </button>
            </div>

            {/* Consultation result */}
            {consultation && (
              <div className="bg-ink rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🤖</span>
                  <div className="text-sm font-black text-white">Análise do CFO</div>
                  {consultation.feasibility_pct !== undefined && (
                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full
                      ${consultation.feasibility_pct <= 60 ? 'bg-green-500/20 text-green-400' : consultation.feasibility_pct <= 100 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                      {consultation.feasibility_pct}% do disponível
                    </span>
                  )}
                </div>

                {consultation.consultation?.viability && (
                  <p className="text-xs text-white/70 leading-relaxed">{consultation.consultation.viability}</p>
                )}

                {consultation.consultation?.strategy?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Estratégia</div>
                    <div className="space-y-2">
                      {consultation.consultation.strategy.map((step: string, i: number) => (
                        <div key={i} className="flex gap-2 items-start">
                          <span className="text-brand font-black text-xs flex-shrink-0">{i + 1}.</span>
                          <span className="text-xs text-white/65 leading-relaxed">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {consultation.consultation?.tips?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Dicas</div>
                    {consultation.consultation.tips.map((tip: string, i: number) => (
                      <div key={i} className="flex gap-2 items-start mb-1">
                        <span className="text-yellow-400 text-xs flex-shrink-0">💡</span>
                        <span className="text-xs text-white/65">{tip}</span>
                      </div>
                    ))}
                  </div>
                )}

                {consultation.consultation?.alerts?.length > 0 && (
                  <div className="bg-red-500/10 rounded-xl p-2.5">
                    {consultation.consultation.alerts.map((alert: string, i: number) => (
                      <div key={i} className="flex gap-2 items-start">
                        <span className="text-red-400 text-xs">⚠️</span>
                        <span className="text-xs text-red-300">{alert}</span>
                      </div>
                    ))}
                  </div>
                )}

                {consultation.consultation?.adjustment && (
                  <div className="bg-brand/15 rounded-xl p-2.5">
                    <span className="text-xs text-brand/90 leading-relaxed">{consultation.consultation.adjustment}</span>
                  </div>
                )}
              </div>
            )}

            {/* Priority */}
            <div>
              <div className="text-xs text-muted mb-2">Prioridade</div>
              <div className="flex gap-2">
                {[{v:1,l:'🔴 Alta'},{v:2,l:'🟡 Média'},{v:3,l:'🟢 Baixa'}].map(p => (
                  <button key={p.v} onClick={() => setForm(f => ({...f, priority: p.v}))}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all
                      ${form.priority === p.v ? 'border-brand bg-brand/8 text-brand' : 'border-gray-100 text-muted'}`}>
                    {p.l}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-muted">
                Cancelar
              </button>
              <button onClick={createGoal} disabled={saving}
                className="flex-1 py-3 rounded-xl bg-brand text-white text-sm font-semibold disabled:opacity-40">
                {saving ? 'Salvando…' : 'Criar meta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Depositar */}
      {depositGoal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="text-lg font-black text-ink">
              {depositGoal.emoji} Depositar em "{depositGoal.name}"
            </div>
            <div className="text-sm text-muted">
              Guardado: {BRL(Number(depositGoal.saved_amount))} / {BRL(Number(depositGoal.target_amount))}
            </div>
            {(() => {
              const sugg = getSuggestion(depositGoal.id)
              return sugg ? (
                <div className="bg-brand/8 rounded-xl p-3 text-xs text-brand">
                  Sugestão: depositar <span className="font-black">{BRL(sugg.suggested_monthly)}</span> este mês
                </div>
              ) : null
            })()}
            <div>
              <label className="text-xs text-muted">Valor a depositar (R$)</label>
              <input
                className="input mt-1" type="number" placeholder="0,00" autoFocus
                value={depositVal}
                onChange={e => setDepositVal(e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDepositGoal(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-muted">
                Cancelar
              </button>
              <button onClick={addDeposit} disabled={saving || !depositVal}
                className="flex-1 py-3 rounded-xl bg-brand text-white text-sm font-semibold disabled:opacity-40">
                {saving ? 'Salvando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
