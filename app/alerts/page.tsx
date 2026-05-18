import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import AlertsPanel from '@/components/alerts/AlertsPanel'

export const dynamic = 'force-dynamic'

export default async function AlertsPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  return (
    <AppShell user={profile}>
      <AlertsPanel />
    </AppShell>
  )
}
