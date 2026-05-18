import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import ProfileClient from './ProfileClient'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: financialProfile }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('financial_profiles').select('*').eq('user_id', user.id).single(),
  ])

  return (
    <AppShell user={profile}>
      <ProfileClient initialProfile={financialProfile ?? null} initialProfileRow={profile ?? null} />
    </AppShell>
  )
}
