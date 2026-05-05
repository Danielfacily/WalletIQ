import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import TransactionsClient from './TransactionsClient'

export default async function TransactionsPage() {
  const supabase = createSupabaseServer()
  const { data:{ user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const [{ data:profile },{ data:fixed },{ data:txs }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id',user.id).single(),
    supabase.from('fixed_budgets').select('*').eq('user_id',user.id).eq('active',true).order('type').order('created_at'),
    supabase.from('transactions').select('*').eq('user_id',user.id).order('date',{ascending:false}).limit(50),
  ])
  return <AppShell user={profile}><TransactionsClient userId={user.id} fixed={fixed||[]} transactions={txs||[]}/></AppShell>
}
