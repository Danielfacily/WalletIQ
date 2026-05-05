import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = createSupabaseServer()
  const { data:{ user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: fixed }, { data: vars }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('fixed_budgets').select('*').eq('user_id', user.id).eq('active', true),
    supabase.from('transactions').select('*').eq('user_id', user.id)
      .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10))
      .lte('date', new Date().toISOString().slice(0,10))
      .order('date', { ascending: false }),
  ])

  return (
    <AppShell user={profile}>
      <DashboardClient
        fixed={fixed??[]}
        transactions={vars??[]}
        profile={profile}
      />
    </AppShell>
  )
}
