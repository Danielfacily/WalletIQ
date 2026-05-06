import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('financial_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({ profile: data ?? null })
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    monthly_income, extra_income, has_emergency_fund, emergency_months,
    has_debt, total_debt, main_goal, savings_target_pct, onboarding_done, onboarding_step
  } = body

  // Calculate profile type based on inputs
  const totalIncome = (monthly_income || 0) + (extra_income || 0)
  const profile_type = classifyProfile({ monthly_income: totalIncome, has_debt, total_debt, has_emergency_fund, savings_target_pct })

  const { data, error } = await supabase
    .from('financial_profiles')
    .upsert({
      user_id: user.id,
      monthly_income: monthly_income ?? 0,
      extra_income: extra_income ?? 0,
      has_emergency_fund: has_emergency_fund ?? false,
      emergency_months: emergency_months ?? 0,
      has_debt: has_debt ?? false,
      total_debt: total_debt ?? 0,
      main_goal: main_goal ?? null,
      savings_target_pct: savings_target_pct ?? 20,
      profile_type,
      onboarding_done: onboarding_done ?? false,
      onboarding_step: onboarding_step ?? 0,
    }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}

function classifyProfile(data: {
  monthly_income: number
  has_debt: boolean
  total_debt: number
  has_emergency_fund: boolean
  savings_target_pct: number
}): string {
  const { monthly_income, has_debt, total_debt, has_emergency_fund, savings_target_pct } = data

  if (has_debt && monthly_income > 0 && total_debt > monthly_income * 6) return 'indebted'
  if (savings_target_pct >= 30 && has_emergency_fund) return 'accumulator'
  if (savings_target_pct >= 20 && !has_debt) return 'aggressive'
  if (!has_emergency_fund && !has_debt && savings_target_pct < 10) return 'conservative'
  return 'moderate'
}
