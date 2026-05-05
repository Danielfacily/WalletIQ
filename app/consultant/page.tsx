import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import ConsultantClient from './ConsultantClient'

export const dynamic = 'force-dynamic'
export default async function ConsultantPage() {
  const supabase = await createSupabaseServer()
  const { data:{ user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data:profile },{ data:fixed },{ data:vars }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id',user.id).single(),
    supabase.from('fixed_budgets').select('type,amount').eq('user_id',user.id).eq('active',true),
    supabase.from('transactions').select('type,amount,category,name,date').eq('user_id',user.id)
      .gte('date',new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().slice(0,10))
      .lte('date',new Date().toISOString().slice(0,10)),
  ])

  const fixedInc=(fixed||[]).filter((f:any)=>f.type==='income').reduce((s:any,f:any)=>s+Number(f.amount),0)
  const fixedExp=(fixed||[]).filter((f:any)=>f.type==='expense').reduce((s:any,f:any)=>s+Number(f.amount),0)
  const varInc=(vars||[]).filter((v:any)=>v.type==='income').reduce((s:any,v:any)=>s+Number(v.amount),0)
  const varExp=(vars||[]).filter((v:any)=>v.type==='expense').reduce((s:any,v:any)=>s+Number(v.amount),0)

  const context={
    mes:new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'}),
    receita_fixa:fixedInc, gasto_fixo:fixedExp,
    receita_variavel:varInc, gasto_variavel:varExp,
    projecao_receita:fixedInc+varInc, projecao_gasto:fixedExp+varExp,
    saldo_projetado:(fixedInc+varInc)-(fixedExp+varExp),
    taxa_poupanca:fixedInc+varInc>0?(((fixedInc+varInc)-(fixedExp+varExp))/(fixedInc+varInc)*100).toFixed(1)+'%':'0%',
    top_gastos:(vars||[]).filter((v:any)=>v.type==='expense').sort((a:any,b:any)=>Number(b.amount)-Number(a.amount)).slice(0,5).map((v:any)=>({nome:v.name,valor:Number(v.amount)})),
  }

  const savePct=fixedInc+varInc>0?Number(((fixedInc+varInc-fixedExp-varExp)/(fixedInc+varInc)*100).toFixed(1)):0

  return (
    <AppShell user={profile}>
      <ConsultantClient context={context} savePct={savePct} plan={profile?.plan||'free'}/>
    </AppShell>
  )
}
