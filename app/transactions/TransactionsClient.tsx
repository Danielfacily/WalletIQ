'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { BRL } from '@/lib/pulse'

const CATS_EXP=[{id:'food',icon:'🍔',name:'Alimentação'},{id:'housing',icon:'🏠',name:'Moradia'},{id:'transport',icon:'🚗',name:'Transporte'},{id:'health',icon:'💊',name:'Saúde'},{id:'leisure',icon:'🎮',name:'Lazer'},{id:'education',icon:'📚',name:'Educação'},{id:'subscription',icon:'📱',name:'Assinatura'},{id:'other_ex',icon:'🛒',name:'Outros'}]
const CATS_INC=[{id:'salary',icon:'💼',name:'Salário'},{id:'freelance',icon:'💻',name:'Freelance'},{id:'investment',icon:'📈',name:'Investimento'},{id:'other_in',icon:'💰',name:'Outros'}]
const ALL_CATS: Record<string,{icon:string;name:string}>={...Object.fromEntries(CATS_EXP.map(c=>[c.id,c])),...Object.fromEntries(CATS_INC.map(c=>[c.id,c]))}

export default function TransactionsClient({ userId, fixed, transactions }: { userId:string; fixed:any[]; transactions:any[] }) {
  const router  = useRouter()
  const [form, setForm] = useState({ name:'', type:'expense', category:'food', recurrence:'variable', amount:'', date:new Date().toISOString().slice(0,10) })
  const [saving, setSaving] = useState(false)
  const [tab, setTab]       = useState<'add'|'list'|'fixed'>('add')

  const cats = form.type==='income' ? CATS_INC : CATS_EXP

  const save = async () => {
    if(!form.name||!form.amount) return
    setSaving(true)
    if(form.recurrence==='fixed') {
      await supabase.from('fixed_budgets').insert({ user_id:userId, type:form.type, name:form.name, category:form.category, amount:parseFloat(form.amount) })
    } else {
      await supabase.from('transactions').insert({ user_id:userId, type:form.type, category:form.category, name:form.name, amount:parseFloat(form.amount), date:form.date })
    }
    setSaving(false)
    setForm(f=>({...f,name:'',amount:''}))
    router.refresh()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="text-3xl font-black text-ink tracking-tight mb-5">Lançar</div>

      {/* Tabs */}
      <div className="flex bg-fill rounded-xl p-1 mb-5">
        {[{k:'add',l:'Novo lançamento'},{k:'list',l:'Variáveis'},{k:'fixed',l:'Fixos'}].map((t:any)=>(
          <button key={t.k} onClick={()=>setTab(t.k)}
            className={`flex-1 py-2 rounded-[10px] text-sm font-semibold transition-all ${tab===t.k?'bg-white text-ink shadow-sm':'text-muted hover:text-ink'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {tab==='add'&&(
        <>
          {/* Amount hero */}
          <div className="text-center mb-5">
            <div className="text-5xl font-black text-ink tracking-tight">
              {form.amount?BRL(parseFloat(form.amount)||0):'R$ 0,00'}
            </div>
          </div>

          <div className="card mb-4">
            {[
              { label:'Descrição', el:<input className="flex-1 outline-none text-right text-sm text-ink bg-transparent" placeholder="Nome da transação" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/> },
              { label:'Valor',     el:<input type="number" className="flex-1 outline-none text-right text-sm text-ink bg-transparent" placeholder="0,00" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/> },
              { label:'Tipo',      el:<select className="flex-1 outline-none text-right text-sm text-brand bg-transparent" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value,category:e.target.value==='income'?'salary':'food'}))}><option value="expense">Gasto</option><option value="income">Receita</option></select> },
              { label:'Categoria', el:<select className="flex-1 outline-none text-right text-sm text-brand bg-transparent" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{cats.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select> },
              { label:'Natureza',  el:<select className="flex-1 outline-none text-right text-sm text-brand bg-transparent" value={form.recurrence} onChange={e=>setForm(f=>({...f,recurrence:e.target.value}))}><option value="variable">⚡ Variável (avulso)</option><option value="fixed">🔒 Fixo mensal</option></select> },
              { label:'Data',      el:<input type="date" className="flex-1 outline-none text-right text-sm text-ink bg-transparent" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/> },
            ].map(({label,el})=>(
              <div key={label} className="flex items-center px-5 py-3.5 border-b border-gray-50 last:border-0 gap-3">
                <span className="text-sm font-medium text-ink w-24 flex-shrink-0">{label}</span>
                {el}
              </div>
            ))}
          </div>

          <div className={`px-4 py-3 rounded-xl text-sm font-medium mb-4 ${form.recurrence==='fixed'?'bg-gray-100 text-muted':'bg-brand/8 text-brand'}`}>
            {form.recurrence==='fixed'?'🔒 Será diluído no ticker por minuto durante o mês. Zera dia 1°.':'⚡ Distribuído nos minutos restantes do mês. Impacto imediato no ticker.'}
          </div>

          <button onClick={save} disabled={saving||!form.name||!form.amount}
            className="w-full bg-brand text-white font-bold py-4 rounded-2xl text-base hover:opacity-90 disabled:opacity-40 transition-opacity">
            {saving?'Salvando...':'Registrar lançamento'}
          </button>
        </>
      )}

      {tab==='list'&&(
        <div className="card">
          {transactions.length===0&&<div className="p-8 text-center text-muted text-sm">Nenhuma transação ainda</div>}
          {transactions.map((t:any)=>{
            const c=ALL_CATS[t.category]||{icon:'•',name:t.category}
            return(
              <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 bg-surface">{c.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink truncate">{t.name}</div>
                  <div className="text-xs text-muted mt-0.5">{c.name} · {new Date(t.date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}</div>
                </div>
                <div className={`text-sm font-bold flex-shrink-0 ${t.type==='income'?'text-green':'text-ink'}`}>
                  {t.type==='income'?'+':'−'}{BRL(Number(t.amount))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab==='fixed'&&(
        <div className="card">
          {fixed.length===0&&<div className="p-8 text-center text-muted text-sm">Nenhum item fixo cadastrado</div>}
          {fixed.map((f:any)=>{
            const c=ALL_CATS[f.category]||{icon:'•',name:f.category}
            return(
              <div key={f.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 bg-surface">{c.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink">{f.name}</div>
                  <div className="text-xs text-muted mt-0.5">{c.name} · diluído no ticker</div>
                </div>
                <div className={`text-sm font-bold flex-shrink-0 ${f.type==='income'?'text-green':'text-ink'}`}>
                  {f.type==='income'?'+':'−'}{BRL(Number(f.amount))}/mês
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
