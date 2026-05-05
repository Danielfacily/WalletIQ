import { createSupabaseServer } from '@/lib/supabase'
import { getPlanFeatures, type PlanKey } from '@/lib/stripe'
import { NextResponse } from 'next/server'

// ── Get user plan from DB ─────────────────────────────────
export async function getUserPlan(): Promise<{ userId: string; plan: PlanKey; aiMsgsToday: number } | null> {
  const supabase = createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('user_plan_status')
    .select('plan, ai_msgs_today, plan_active')
    .eq('id', user.id)
    .single()

  const plan = (data?.plan_active ? data?.plan : 'free') as PlanKey

  return {
    userId:      user.id,
    plan,
    aiMsgsToday: data?.ai_msgs_today ?? 0,
  }
}

// ── Guard: AI messages ────────────────────────────────────
export async function guardAI() {
  const ctx = await getUserPlan()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const features = getPlanFeatures(ctx.plan)

  if (ctx.aiMsgsToday >= features.aiMsgsPerDay) {
    return NextResponse.json({
      error:   'Limite de mensagens atingido',
      limit:   features.aiMsgsPerDay,
      plan:    ctx.plan,
      upgrade: true,
      message: ctx.plan === 'free'
        ? `Plano Free: ${features.aiMsgsPerDay} mensagens por dia. Faça upgrade para Pro e use sem limites.`
        : 'Limite diário atingido.',
    }, { status: 429 })
  }

  return null // null = allowed
}

// ── Guard: Banks ──────────────────────────────────────────
export async function guardBanks(currentBanks: number) {
  const ctx = await getUserPlan()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const features = getPlanFeatures(ctx.plan)

  if (currentBanks >= features.maxBanks) {
    return NextResponse.json({
      error:   'Limite de bancos atingido',
      limit:   features.maxBanks,
      plan:    ctx.plan,
      upgrade: true,
      message: ctx.plan === 'free'
        ? 'Plano Free: 1 banco conectado. Faça upgrade para Pro e conecte bancos ilimitados.'
        : 'Limite de bancos atingido.',
    }, { status: 403 })
  }

  return null
}

// ── Increment AI usage counter ────────────────────────────
export async function incrementAIUsage(userId: string) {
  const supabase = createSupabaseServer()
  await supabase.rpc('increment_ai_usage', { p_user_id: userId })
}

// ── Check feature access (for UI) ────────────────────────
export function canAccess(plan: PlanKey, feature: 'pdfReports' | 'familyMembers' | 'historyMonths', value?: number): boolean {
  const f = getPlanFeatures(plan)
  if (feature === 'pdfReports')     return f.pdfReports
  if (feature === 'familyMembers')  return f.familyMembers > 0
  if (feature === 'historyMonths')  return (value ?? 1) <= f.historyMonths
  return false
}
