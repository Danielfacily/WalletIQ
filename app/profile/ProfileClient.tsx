'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BRL } from '@/lib/pulse'

interface ProfileRow {
  phone?: string | null
}

interface FinancialProfile {
  monthly_income: number
  extra_income: number
  has_emergency_fund: boolean
  emergency_months: number
  has_debt: boolean
  total_debt: number
  main_goal: string | null
  savings_target_pct: number
  profile_type: string
  onboarding_done: boolean
  onboarding_step: number
}

const PROFILE_LABELS: Record<string, { label: string; icon: string; color: string; desc: string }> = {
  conservative: { label: 'Conservador',  icon: '🛡️', color: 'text-blue-600',   desc: 'Prefere segurança a crescimento. Bom para começar.' },
  moderate:     { label: 'Moderado',     icon: '⚖️', color: 'text-brand',      desc: 'Bom equilíbrio entre segurança e crescimento.' },
  aggressive:   { label: 'Acumulador',   icon: '🚀', color: 'text-green-600',  desc: 'Focado em crescimento e acumulação de patrimônio.' },
  accumulator:  { label: 'Investidor',   icon: '📈', color: 'text-purple-600', desc: 'Alta taxa de poupança, reserva de emergência sólida.' },
  indebted:     { label: 'Em dívidas',   icon: '⚠️', color: 'text-red-600',   desc: 'Foco em quitar dívidas antes de poupar.' },
  undefined:    { label: 'Indefinido',   icon: '❓', color: 'text-muted',      desc: 'Complete seu perfil para classificação.' },
}

const GOALS = [
  { id: 'emergencia',   icon: '🛡️', label: 'Reserva de emergência' },
  { id: 'viagem',       icon: '✈️', label: 'Viagem dos sonhos' },
  { id: 'imovel',       icon: '🏠', label: 'Casa própria' },
  { id: 'veiculo',      icon: '🚗', label: 'Veículo' },
  { id: 'aposentadoria',icon: '🌅', label: 'Aposentadoria' },
  { id: 'educacao',     icon: '🎓', label: 'Educação' },
  { id: 'saude',        icon: '💊', label: 'Saúde / cirurgia' },
  { id: 'outro',        icon: '🎯', label: 'Outro objetivo' },
]

const STEPS = ['Renda', 'Dívidas', 'Reserva', 'Objetivo', 'Perfil']

export default function ProfileClient({ initialProfile, initialProfileRow }: { initialProfile: FinancialProfile | null; initialProfileRow?: ProfileRow | null }) {
  const router = useRouter()
  const isOnboarding = !initialProfile?.onboarding_done || (initialProfile?.monthly_income ?? 0) === 0

  const [step, setStep] = useState(isOnboarding ? (initialProfile?.onboarding_step ?? 0) : -1)
  const [saving, setSaving] = useState(false)
  const [phone, setPhone] = useState(initialProfileRow?.phone ?? '')
  const [phoneSaving, setPhoneSaving] = useState(false)
  const [phoneSaved, setPhoneSaved] = useState(false)
  const [form, setForm] = useState<Partial<FinancialProfile>>({
    monthly_income:      initialProfile?.monthly_income      ?? 0,
    extra_income:        initialProfile?.extra_income        ?? 0,
    has_emergency_fund:  initialProfile?.has_emergency_fund  ?? false,
    emergency_months:    initialProfile?.emergency_months    ?? 0,
    has_debt:            initialProfile?.has_debt            ?? false,
    total_debt:          initialProfile?.total_debt          ?? 0,
    main_goal:           initialProfile?.main_goal           ?? null,
    savings_target_pct:  initialProfile?.savings_target_pct  ?? 20,
  })

  const profile = initialProfile

  const savePhone = async () => {
    setPhoneSaving(true)
    await fetch('/api/profile/phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    setPhoneSaving(false)
    setPhoneSaved(true)
    setTimeout(() => setPhoneSaved(false), 3000)
  }

  const save = async (extraData?: Partial<FinancialProfile>) => {
    setSaving(true)
    const payload = { ...form, ...extraData }
    await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
  }

  const nextStep = async () => {
    const nextS = step + 1
    if (nextS >= STEPS.length) {
      await save({ onboarding_done: true, onboarding_step: STEPS.length })
      router.refresh()
      setStep(-1)
    } else {
      await save({ onboarding_step: nextS })
      setStep(nextS)
    }
  }

  const totalIncome = (Number(form.monthly_income) || 0) + (Number(form.extra_income) || 0)
  const suggestedSavings = Math.round(totalIncome * (form.savings_target_pct ?? 20) / 100)

  // Onboarding flow
  if (step >= 0) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm font-bold text-muted">Passo {step + 1} de {STEPS.length}</div>
              <div className="text-sm font-bold text-brand">{STEPS[step]}</div>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all duration-500"
                style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              {STEPS.map((s, i) => (
                <div key={s} className={`text-[10px] font-semibold ${i <= step ? 'text-brand' : 'text-muted'}`}>{s}</div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            {/* Step 0: Renda */}
            {step === 0 && (
              <>
                <div className="text-2xl mb-1">💼</div>
                <h2 className="text-xl font-black text-ink mb-1">Qual é sua renda?</h2>
                <p className="text-sm text-muted mb-5">Isso nos ajuda a criar seu plano financeiro personalizado.</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted">Renda mensal principal (R$)</label>
                    <input
                      type="number"
                      className="input mt-1"
                      placeholder="Ex: 5000"
                      value={form.monthly_income || ''}
                      onChange={e => setForm(f => ({ ...f, monthly_income: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted">Renda extra mensal (freelance, aluguéis…)</label>
                    <input
                      type="number"
                      className="input mt-1"
                      placeholder="0"
                      value={form.extra_income || ''}
                      onChange={e => setForm(f => ({ ...f, extra_income: Number(e.target.value) }))}
                    />
                  </div>
                  {totalIncome > 0 && (
                    <div className="bg-brand/8 rounded-xl p-3 text-sm text-brand font-semibold">
                      Renda total: {BRL(totalIncome)}/mês
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Step 1: Dívidas */}
            {step === 1 && (
              <>
                <div className="text-2xl mb-1">💳</div>
                <h2 className="text-xl font-black text-ink mb-1">Você tem dívidas?</h2>
                <p className="text-sm text-muted mb-5">Cartão de crédito, empréstimo, financiamento…</p>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    {[
                      { v: false, label: 'Não, estou limpo!', icon: '✅' },
                      { v: true,  label: 'Sim, tenho dívidas', icon: '💸' },
                    ].map(opt => (
                      <button
                        key={String(opt.v)}
                        onClick={() => setForm(f => ({ ...f, has_debt: opt.v }))}
                        className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-semibold
                          ${form.has_debt === opt.v ? 'border-brand bg-brand/8 text-brand' : 'border-gray-100 text-muted hover:border-gray-200'}`}
                      >
                        <span className="text-2xl">{opt.icon}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {form.has_debt && (
                    <div>
                      <label className="text-xs font-semibold text-muted">Total aproximado das dívidas (R$)</label>
                      <input
                        type="number"
                        className="input mt-1"
                        placeholder="Ex: 15000"
                        value={form.total_debt || ''}
                        onChange={e => setForm(f => ({ ...f, total_debt: Number(e.target.value) }))}
                      />
                      {form.total_debt && totalIncome > 0 && (
                        <div className="text-xs text-muted mt-2">
                          Equivale a {Math.round((form.total_debt || 0) / totalIncome)} meses de renda
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Step 2: Reserva de emergência */}
            {step === 2 && (
              <>
                <div className="text-2xl mb-1">🛡️</div>
                <h2 className="text-xl font-black text-ink mb-1">Reserva de emergência</h2>
                <p className="text-sm text-muted mb-5">O ideal é ter 3–6 meses de despesas guardados.</p>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    {[
                      { v: true,  label: 'Tenho reserva', icon: '🏦' },
                      { v: false, label: 'Ainda não tenho', icon: '🎯' },
                    ].map(opt => (
                      <button
                        key={String(opt.v)}
                        onClick={() => setForm(f => ({ ...f, has_emergency_fund: opt.v }))}
                        className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-semibold
                          ${form.has_emergency_fund === opt.v ? 'border-brand bg-brand/8 text-brand' : 'border-gray-100 text-muted hover:border-gray-200'}`}
                      >
                        <span className="text-2xl">{opt.icon}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {form.has_emergency_fund && (
                    <div>
                      <label className="text-xs font-semibold text-muted">Quantos meses de despesas você tem guardados?</label>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {[1, 2, 3, 4, 5, 6, 9, 12].map(m => (
                          <button
                            key={m}
                            onClick={() => setForm(f => ({ ...f, emergency_months: m }))}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all
                              ${form.emergency_months === m ? 'bg-brand text-white' : 'bg-gray-100 text-muted hover:bg-gray-200'}`}
                          >
                            {m}m
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {!form.has_emergency_fund && (
                    <div className="bg-orange-50 rounded-xl p-3 text-sm text-orange-700">
                      Vamos criar um objetivo de reserva de emergência para você!
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Step 3: Objetivo principal */}
            {step === 3 && (
              <>
                <div className="text-2xl mb-1">🎯</div>
                <h2 className="text-xl font-black text-ink mb-1">Qual é seu maior sonho?</h2>
                <p className="text-sm text-muted mb-5">Seu objetivo financeiro principal agora.</p>
                <div className="grid grid-cols-2 gap-2">
                  {GOALS.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setForm(f => ({ ...f, main_goal: g.id }))}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-semibold text-left
                        ${form.main_goal === g.id ? 'border-brand bg-brand/8 text-brand' : 'border-gray-100 text-ink hover:border-gray-200'}`}
                    >
                      <span className="text-xl">{g.icon}</span>
                      <span className="text-xs leading-tight">{g.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Step 4: Meta de poupança */}
            {step === 4 && (
              <>
                <div className="text-2xl mb-1">💰</div>
                <h2 className="text-xl font-black text-ink mb-1">Quanto quer poupar?</h2>
                <p className="text-sm text-muted mb-5">A regra 50/30/20 recomenda pelo menos 20% da renda.</p>
                <div className="mb-4">
                  <div className="flex justify-between text-xs font-semibold text-muted mb-2">
                    <span>5%</span>
                    <span className="text-brand text-base font-black">{form.savings_target_pct}%</span>
                    <span>50%</span>
                  </div>
                  <input
                    type="range" min="5" max="50" step="5"
                    className="w-full accent-brand"
                    value={form.savings_target_pct ?? 20}
                    onChange={e => setForm(f => ({ ...f, savings_target_pct: Number(e.target.value) }))}
                  />
                </div>
                {totalIncome > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
                      <span className="text-sm font-semibold text-green-700">💰 Poupança mensal</span>
                      <span className="text-sm font-black text-green-700">{BRL(suggestedSavings)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm font-semibold text-muted">💳 Para gastos</span>
                      <span className="text-sm font-black text-ink">{BRL(totalIncome - suggestedSavings)}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            <button
              onClick={nextStep}
              disabled={saving || (step === 0 && !form.monthly_income)}
              className="w-full mt-6 bg-brand text-white font-bold py-4 rounded-2xl text-base hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {saving ? 'Salvando…' : step === STEPS.length - 1 ? 'Finalizar perfil ✓' : 'Próximo →'}
            </button>

            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="w-full mt-2 text-sm text-muted py-2">
                ← Voltar
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Profile view (after onboarding)
  const profileInfo = PROFILE_LABELS[profile?.profile_type ?? 'undefined'] ?? PROFILE_LABELS.undefined
  const totalIncomeProfile = (profile?.monthly_income ?? 0) + (profile?.extra_income ?? 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-ink">Meu Perfil</h1>
          <p className="text-sm text-muted mt-0.5">Perfil financeiro personalizado</p>
        </div>
        <button
          onClick={() => setStep(0)}
          className="text-sm font-semibold text-brand hover:opacity-70 transition-opacity"
        >
          Editar →
        </button>
      </div>

      {/* Profile card */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center text-3xl">
            {profileInfo.icon}
          </div>
          <div>
            <div className={`text-xl font-black ${profileInfo.color}`}>{profileInfo.label}</div>
            <div className="text-sm text-muted mt-0.5">{profileInfo.desc}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface rounded-xl p-3">
            <div className="text-xs text-muted mb-1">Renda mensal</div>
            <div className="text-base font-black text-ink">{BRL(totalIncomeProfile)}</div>
          </div>
          <div className="bg-surface rounded-xl p-3">
            <div className="text-xs text-muted mb-1">Meta de poupança</div>
            <div className="text-base font-black text-brand">{profile?.savings_target_pct ?? 20}%</div>
          </div>
          <div className="bg-surface rounded-xl p-3">
            <div className="text-xs text-muted mb-1">Reserva de emerg.</div>
            <div className="text-base font-black text-ink">
              {profile?.has_emergency_fund ? `${profile.emergency_months} meses` : 'Sem reserva'}
            </div>
          </div>
          <div className="bg-surface rounded-xl p-3">
            <div className="text-xs text-muted mb-1">Dívidas</div>
            <div className={`text-base font-black ${profile?.has_debt ? 'text-red-600' : 'text-green-600'}`}>
              {profile?.has_debt ? BRL(profile.total_debt ?? 0) : 'Livre de dívidas'}
            </div>
          </div>
        </div>
      </div>

      {/* Main goal */}
      {profile?.main_goal && (
        <div className="card p-5 mb-4">
          <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Objetivo principal</div>
          {(() => {
            const g = GOALS.find(g => g.id === profile.main_goal)
            return g ? (
              <div className="flex items-center gap-3">
                <span className="text-2xl">{g.icon}</span>
                <span className="text-base font-bold text-ink">{g.label}</span>
              </div>
            ) : null
          })()}
        </div>
      )}

      {/* Recommendations based on profile */}
      <div className="card p-5 mb-4">
        <div className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Recomendações para seu perfil</div>
        <div className="space-y-3">
          {getRecommendations(profile).map((rec, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="text-lg flex-shrink-0">{rec.icon}</span>
              <div>
                <div className="text-sm font-semibold text-ink">{rec.title}</div>
                <div className="text-xs text-muted mt-0.5">{rec.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WhatsApp connection */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">💬</span>
          <div className="text-xs font-bold text-muted uppercase tracking-wider">WhatsApp</div>
        </div>
        <p className="text-xs text-muted mb-4">
          Conecte seu WhatsApp para registrar gastos por mensagem, consultar saldo e receber alertas críticos direto no celular.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted">Número (com DDD, sem +)</label>
            <input
              type="tel"
              className="input mt-1"
              placeholder="5511999999999"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
            />
            <div className="text-[10px] text-muted mt-1">Formato: código do país + DDD + número. Ex: 5511999999999</div>
          </div>
          <button
            onClick={savePhone}
            disabled={phoneSaving || !phone}
            className="w-full bg-green-500 text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {phoneSaving ? 'Salvando…' : phoneSaved ? '✓ Salvo!' : 'Vincular WhatsApp'}
          </button>
          {phone && (
            <div className="bg-green-50 rounded-xl p-3 text-xs text-green-700 space-y-1">
              <div className="font-semibold">Após vincular, você pode:</div>
              <div>• Enviar <em>gastei 50 no almoço</em> para registrar</div>
              <div>• Enviar <em>saldo</em> para consultar o mês</div>
              <div>• Enviar <em>resumo</em> para ver gastos por categoria</div>
              <div>• Receber alertas automáticos de orçamento</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getRecommendations(profile: FinancialProfile | null) {
  if (!profile) return []
  const recs = []
  const totalIncome = (profile.monthly_income || 0) + (profile.extra_income || 0)

  if (!profile.has_emergency_fund) {
    recs.push({
      icon: '🛡️',
      title: 'Monte sua reserva de emergência',
      desc: `Guarde ${BRL(totalIncome * 0.1)}/mês até ter 3–6 meses de despesas guardados.`,
    })
  }

  if (profile.has_debt && profile.total_debt > 0) {
    recs.push({
      icon: '💳',
      title: 'Priorize quitar dívidas',
      desc: `Dívida de ${BRL(profile.total_debt)} pode estar te custando mais do que qualquer investimento.`,
    })
  }

  if (profile.savings_target_pct < 20) {
    recs.push({
      icon: '📈',
      title: 'Aumente sua taxa de poupança',
      desc: `Você está poupando ${profile.savings_target_pct}%. Tente chegar a 20% gradualmente.`,
    })
  }

  if (profile.profile_type === 'accumulator' || profile.savings_target_pct >= 20) {
    recs.push({
      icon: '🚀',
      title: 'Considere investir o excedente',
      desc: 'Com a reserva formada, invista o restante em renda fixa ou variável.',
    })
  }

  recs.push({
    icon: '🎯',
    title: 'Revise suas metas mensalmente',
    desc: 'Ajuste seu plano conforme sua renda e gastos reais mudam.',
  })

  return recs.slice(0, 4)
}
