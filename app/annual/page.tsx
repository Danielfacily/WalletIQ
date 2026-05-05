import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'

export default async function AnnualPage() {
  const supabase = createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  return (
    <AppShell user={profile}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-3xl font-black text-ink tracking-tight mb-2">Visão Anual</div>
        <p className="text-muted">Em breve — projeção de 12 meses com gráficos e tabela completa.</p>
      </div>
    </AppShell>
  )
}
