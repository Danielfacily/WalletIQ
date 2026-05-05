import { createSupabaseServer } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import CalendarClient from './CalendarClient'

export default async function CalendarPage() {
  const supabase = createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <AppShell user={profile}>
      <CalendarClient />
    </AppShell>
  )
}
