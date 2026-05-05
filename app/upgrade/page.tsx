import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import UpgradeClient from './UpgradeClient'

export const dynamic = 'force-dynamic'
export default async function UpgradePage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_plan_status')
    .select('plan, plan_active, ai_msgs_today')
    .eq('id', user.id)
    .single()

  return (
    <AppShell user={profile}>
      <UpgradeClient currentPlan={profile?.plan ?? 'free'} aiMsgsToday={profile?.ai_msgs_today ?? 0}/>
    </AppShell>
  )
}
