import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import PluggyConnect from '@/components/pluggy/PluggyConnect'
import MetaMaskConnect from '@/components/metamask/MetaMaskConnect'

export const dynamic = 'force-dynamic'
export default async function ConnectionsPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  return (
    <AppShell user={profile}>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-ink">Conexões</h1>
          <p className="text-sm text-muted mt-0.5">Conecte seus bancos e carteiras para importar transações automaticamente</p>
        </div>
        <PluggyConnect />
        <MetaMaskConnect />
      </div>
    </AppShell>
  )
}
