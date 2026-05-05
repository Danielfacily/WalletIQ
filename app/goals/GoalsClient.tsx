'use client'
import { useState, useEffect, useCallback } from 'react'

interface Goal {
  id: string
  name: string
  emoji: string
  target_amount: number
  saved_amount: number
  deadline: string | null
}

const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const EMOJIS = ['🎯','🏠','🚗','✈️','📱','💍','🎓','💊','🐕','🎮','🏋️','🌊','🎸','👶','💼']

function pct(saved: number, target: number) {
  return Math.min(100, Math.round((saved / target) * 100))
}

function daysLeft(deadline: string | null) {
  if (!deadline) return null
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  return diff
}

export default function GoalsClient() {
  const [goals,   setGoals]   = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [depositGoal, setDepositGoal] = useState<Goal | null>(null)
  const [depositVal,  setDepositVal]  = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  // form state
  const [form, setForm] = useState({ name: '', emoji: '🎯', target_amount: '', deadline: '' })

  const fetchGoals = useCallback(async () => {
    const res  = await fetch('/api/goals')
    const json = await res.json()
    setGoals(json.goals ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  const createGoal = async () => {
    if (!form.name || !form.target_amount) { setError('Preencha nome e valor alvo'); return }
    setSaving(true); setError(null)
    const res  = await fetch('/api/goals', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...form, target_amount: Number(form.target_amount) }),
    })
    const json = await res.json()
    if (json.error) { setError(json.error); setSaving(false); return }
    setShowAdd(false)
    setForm({ name: '', emoji: '🎯', target_amount: '', deadline: '' })
    setSaving(false)
    await fetchGoals()
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
    await fetchGoals()
  }

  const completed = goals.filter(g => Number(g.saved_amount) >= Number(g.target_amount))
  const active    = goals.filter(g => Number(g.saved_amount) <  Number(g.target_amount))

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-ink">Objetivos</h1>
          <p className="text-sm text-muted mt-0.5">Defina metas e acompanhe seu progresso</p>
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
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card p-4 text-center">
            <div className="text-2xl font-black text-ink">{goals.length}</div>
            <div className="text-xs text-muted mt-1">Total de metas</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-black text-green-600">{completed.length}</div>
            <div className="text-xs text-muted mt-1">Concluídas</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-sm font-black text-brand">
              {BRL(goals.reduce((s, g) => s + Number(g.saved_amount), 0))}
            </div>
            <div className="text-xs text-muted mt-1">Total guardado</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card p-10 text-center text-muted animate-pulse text-sm">Carregando…</div>
      ) : goals.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">🎯</div>
          <div className="text-base font-bold text-ink mb-1">Nenhuma meta criada</div>
          <div className="text-sm text-muted">Crie sua primeira meta financeira e comece a poupar com foco</div>
        </div>
      ) : (
        <div className="space-y-4">
          {active.map(g => {
            const p    = pct(Number(g.saved_amount), Number(g.target_amount))
            const days = daysLeft(g.deadline)
            return (
              <div key={g.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-2xl">{g.emoji}</div>
                    <div>
                      <div className="font-bold text-ink">{g.name}</div>
                      <div className="text-xs text-muted">
                        {BRL(Number(g.saved_amount))} de {BRL(Number(g.target_amount))}
                        {days !== null && (
                          <span className={`ml-2 ${days < 0 ? 'text-red-500' : days < 30 ? 'text-yellow-600' : 'text-muted'}`}>
                            · {days < 0 ? `${Math.abs(days)}d atrasado` : `${days}d restantes`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setDepositGoal(g); setDepositVal('') }}
                      className="text-xs font-semibold text-brand hover:opacity-70 transition-opacity"
                    >
                      + Depositar
                    </button>
                    <button
                      onClick={() => deleteGoal(g.id)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand transition-all duration-500"
                      style={{ width: `${p}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-brand w-10 text-right">{p}%</span>
                </div>
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
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="text-lg font-black text-ink">Nova meta</div>

            {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</div>}

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
