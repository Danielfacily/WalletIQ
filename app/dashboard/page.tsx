import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'
export default async function DashboardPage() {
  const supabase = await createSupabaseServer()
  const { data:{ user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const today = now.toISOString().slice(0, 10)

  const [{ data: profile }, { data: fp }, { data: fixed }, { data: vars }, { data: yearVars }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('financial_profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('fixed_budgets').select('*').eq('user_id', user.id).eq('active', true),
    supabase.from('transactions').select('*').eq('user_id', user.id)
      .gte('date', monthStart)
      .lte('date', today)
      .order('date', { ascending: false }),
    supabase.from('transactions').select('*').eq('user_id', user.id)
      .gte('date', yearStart)
      .lte('date', today)
      .order('date', { ascending: false }),
  ])

  if (!fp || !fp.onboarding_done) {
    redirect('/profile')
  }

  return (
    <AppShell user={profile}>
      <DashboardClient
        fixed={fixed??[]}
        transactions={vars??[]}
        yearTransactions={yearVars??[]}
        profile={profile}
        financialProfile={fp}
      />
    </AppShell>
  )
}
