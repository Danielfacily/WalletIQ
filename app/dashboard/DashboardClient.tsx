'use client'
import { useState, useEffect } from 'react'
import { calcPulse, BRL, BRLK, MONO4, fmtCountdown } from '@/lib/pulse'
import AlertsPanel from '@/components/alerts/AlertsPanel'

type Period = 'day'|'week'|'month'|'year'

const CATS: Record<string,{icon:string;name:string;color:string}> = {
  food:         { icon:'🍔', name:'Alimentação', color:'#FF9500' },
  housing:      { icon:'🏠', name:'Moradia',     color:'#007AFF' },
  transport:    { icon:'🚗', name:'Transporte',  color:'#34C759' },
  health:       { icon:'💊', name:'Saúde',       color:'#FF2D55' },
  leisure:      { icon:'🎮', name:'Lazer',       color:'#AF52DE' },
  education:    { icon:'📚', name:'Educação',    color:'#5AC8FA' },
  subscription: { icon:'📱', name:'Assinatura',  color:'#FF3B30' },
  salary:       { icon:'💼', name:'Salário',     color:'#34C759' },
  freelance:    { icon:'💻', name:'Freelance',   color:'#007AFF' },
  investment:   { icon:'📈', name:'Investimento',color:'#FF9500' },
  other_ex:     { icon:'🛒', name:'Outros',      color:'#8E8E93' },
  other_in:     { icon:'💰', name:'Outros',      color:'#5AC8FA' },
}

function Ring({ income, expense, size=140 }: { income:number; expense:number; size?:number }) {
  const cx=size/2, cy=size/2, rO=size*.38, rI=size*.27
  const cO=2*Math.PI*rO, cI=2*Math.PI*rI
  const tot=income+expense||1
  const savePct=Math.max(0,(income-expense)/(income||1))
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={rO} fill="none" stroke="#f2f2f7" strokeWidth={size*.09}/>
      <circle cx={cx} cy={cy} r={rO} fill="none" stroke="#34C759" strokeWidth={size*.09}
        strokeDasharray={`${cO*(income/tot)} ${cO}`} strokeDashoffset={cO*.25} strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r={rI} fill="none" stroke="#f2f2f7" strokeWidth={size*.08}/>
      <circle cx={cx} cy={cy} r={rI} fill="none" stroke="#FF3B30" strokeWidth={size*.08}
        strokeDasharray={`${cI*(expense/tot)} ${cI}`} strokeDashoffset={cI*.25} strokeLinecap="round"/>
      <text x={cx} y={cy-4} textAnchor="middle" fontSize={size*.112} fontWeight="800" fontFamily="Figtree,sans-serif" fill="#1c1c1e">
        {Math.round(savePct*100)}%
      </text>
      <text x={cx} y={cy+size*.1} textAnchor="middle" fontSize={size*.072} fontWeight="600" fontFamily="Figtree,sans-serif" fill="#8e8e93">
        poupado
      </text>
    </svg>
  )
}

function MiniRing({ pct, color, size=68 }: { pct:number; color:string; size?:number }) {
  const cx=size/2, cy=size/2, r=size*.36, c=2*Math.PI*r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f2f2f7" strokeWidth={size*.12}/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={size*.12}
        strokeDasharray={`${c*Math.min(Math.max(pct,0),1)} ${c}`}
        strokeDashoffset={c*.25} strokeLinecap="round"/>
      <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle"
        fontSize={size*.22} fontWeight="800" fontFamily="Figtree,sans-serif" fill="#1c1c1e">
        {Math.round(Math.min(pct,1)*100)}
      </text>
    </svg>
  )
}

export default function DashboardClient({ fixed, transactions, profile }: {
  fixed: any[]; transactions: any[]; profile: any
}) {
  const [now, setNow]       = useState(new Date())
  const [period, setPeriod] = useState<Period>('month')

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const pulse = calcPulse(
    fixed.map(f => ({ type: f.type, amount: Number(f.amount) })),
    transactions.map(t => ({ type: t.type, amount: Number(t.amount), date: t.date })),
    now
  )

  const acc = pulse.accumulated[period]
  const savePct = pulse.projected.savingsPct

  // Category breakdown
  const expByCat = Object.entries(
    transactions.filter(t=>t.type==='expense').reduce((m:any,t)=>{
      m[t.category]=(m[t.category]||0)+Number(t.amount); return m
    },{})
  ).sort((a:any,b:any)=>b[1]-a[1]).slice(0,6)
  const maxCat = (expByCat[0]?.[1] as number)||1

  const alertColor = savePct>=20?'#34C759':savePct>=10?'#FF9500':'#FF3B30'

  const PERIODS: {k:Period;l:string}[] = [
    {k:'day',l:'Hoje'},{k:'week',l:'Semana'},{k:'month',l:'Mês'},{k:'year',l:'Ano'}
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">

      {/* HEADER */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="text-3xl font-black text-ink tracking-tight leading-tight">
            Saúde<br/>Financeira
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider">
            {now.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}
          </div>
          <div className="font-mono text-sm text-muted">{now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</div>
        </div>
      </div>

      {/* SMART ALERTS (compact) */}
      <AlertsPanel compact />

      {/* PERIOD SEGMENT */}
      <div className="flex bg-fill rounded-xl p-1 mb-5">
        {PERIODS.map(p=>(
          <button key={p.k} onClick={()=>setPeriod(p.k)}
            className={`flex-1 py-2 rounded-[10px] text-sm font-semibold transition-all
              ${period===p.k?'bg-white text-ink shadow-sm':'text-muted hover:text-ink'}`}>
            {p.l}
          </button>
        ))}
      </div>

      {/* BALANCE HERO */}
      <div className="mb-5 animate-fade-up">
        <div className="text-xs font-bold text-muted uppercase tracking-widest mb-1">
          {period==='day'?'Hoje':period==='week'?'Esta semana':period==='month'?'Este mês':'Este ano'} · acumulado
        </div>
        <div className={`text-5xl font-black tracking-tight leading-none mb-2 ${acc.net>=0?'text-ink':'text-red'}`}>
          {BRL(acc.net)}
        </div>
        <div className="flex gap-4 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green inline-block"/>
            +{BRL(acc.income)}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red inline-block"/>
            −{BRL(acc.expense)}
          </span>
        </div>
      </div>

      {/* RESET CHIPS */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {[
          {label:'Dia',   val:fmtCountdown(pulse.resets.dayMs),   color:'text-green'},
          {label:'Semana',val:fmtCountdown(pulse.resets.weekMs),  color:'text-brand'},
          {label:'Mês',   val:fmtCountdown(pulse.resets.monthMs), color:'text-orange'},
          {label:'Ano',   val:`${12-now.getMonth()-1}m`,          color:'text-purple'},
        ].map(r=>(
          <div key={r.label} className="flex-shrink-0 bg-white rounded-xl px-4 py-2.5 shadow-card">
            <div className="text-[10px] font-bold text-muted uppercase tracking-wider">{r.label}</div>
            <div className={`text-sm font-black ${r.color}`}>{r.val}</div>
          </div>
        ))}
      </div>

      {/* HEALTH RINGS CARD */}
      <div className="card card-pad mb-5 animate-fade-up">
        <div className="text-xs font-bold text-muted uppercase tracking-widest mb-4">
          Saúde Financeira · {now.toLocaleDateString('pt-BR',{month:'long'})}
        </div>
        <div className="flex items-end justify-around mb-5">
          <div className="flex flex-col items-center gap-2">
            <MiniRing pct={savePct/100} color="#34C759" size={68}/>
            <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Poupança</div>
          </div>
          <Ring income={pulse.projected.income} expense={pulse.projected.expense} size={140}/>
          <div className="flex flex-col items-center gap-2">
            <MiniRing pct={pulse.meta.pct} color="#007AFF" size={68}/>
            <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Mês</div>
          </div>
        </div>
        {[
          { label:'Receita prevista', sub:`${BRL(pulse.projected.income-pulse.projected.savings)} fixo + ${BRL(pulse.breakdown.varIM*pulse.meta.minsLeft)} var`, val:`+${BRL(pulse.projected.income)}`, color:'text-green' },
          { label:'Gasto previsto',   sub:`${BRL(fixed.filter((f:any)=>f.type==='expense').reduce((s:any,f:any)=>s+Number(f.amount),0))} fixo + ${BRL(transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0))} var`, val:`−${BRL(pulse.projected.expense)}`, color:'text-red' },
          { label:'Saldo projetado',  sub:`fim de ${now.toLocaleDateString('pt-BR',{month:'long'})}`, val:BRL(pulse.projected.savings), color: pulse.projected.savings>=0?'text-brand':'text-red' },
        ].map((r,i)=>(
          <div key={i} className="flex justify-between items-center py-3 border-t border-gray-50">
            <div>
              <div className="text-sm font-semibold text-ink">{r.label}</div>
              <div className="text-xs text-muted mt-0.5">{r.sub}</div>
            </div>
            <div className={`text-base font-bold ${r.color}`}>{r.val}</div>
          </div>
        ))}
      </div>

      {/* ACCUMULATION INDICATORS */}
      <div className="grid grid-cols-3 gap-3 mb-5 animate-fade-up">
        {[
          {k:'day'  as Period, label:'Hoje',   color:'#34C759', reset:`zera ${fmtCountdown(pulse.resets.dayMs)}`},
          {k:'week' as Period, label:'Semana', color:'#007AFF', reset:`zera ${fmtCountdown(pulse.resets.weekMs)}`},
          {k:'month'as Period, label:'Mês',    color:'#FF9500', reset:`zera ${fmtCountdown(pulse.resets.monthMs)}`},
        ].map(ind=>{
          const a=pulse.accumulated[ind.k]
          return(
            <div key={ind.k} className="bg-white rounded-chip p-3 shadow-card">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{background:ind.color}}/>
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{ind.label}</span>
              </div>
              <div className="text-xs font-bold mb-0.5" style={{color:'#34C759'}}>+{BRLK(a.income)}</div>
              <div className="text-xs font-bold mb-2" style={{color:'#FF3B30'}}>−{BRLK(a.expense)}</div>
              <div className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-lg ${a.net>=0?'bg-green/10 text-green':'bg-red/10 text-red'}`}>
                {BRL(a.net)}
              </div>
              <div className="text-[9px] text-muted/60 mt-1.5">{ind.reset}</div>
            </div>
          )
        })}
      </div>

      {/* PULSE CARD */}
      <div className="bg-ink rounded-apple p-5 mb-5 shadow-dark animate-fade-up">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase tracking-widest">
            <span className="live-dot"/>&nbsp;Fluxo por minuto
          </div>
          <div className="text-[10px] text-white/20 font-semibold">
            ZERA 01/{(now.getMonth()+2>12?1:now.getMonth()+2).toString().padStart(2,'0')}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div>
            <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">Ganhando</div>
            <div className="font-mono text-lg font-bold text-green leading-tight">R$ {MONO4(pulse.perMinute.income)}</div>
            <div className="text-[10px] text-white/20 mt-1">{BRL(pulse.perHour.income)}/hora</div>
          </div>
          <div className="flex flex-col items-center justify-center gap-1.5">
            <div className="text-[9px] text-white/20 font-bold uppercase">VS</div>
            <div className={`font-mono text-xs font-bold px-2.5 py-1 rounded-full ${pulse.perMinute.net>=0?'bg-green/20 text-green':'bg-red/20 text-red'}`}>
              {pulse.perMinute.net>=0?'+':''}{MONO4(pulse.perMinute.net)}/min
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">Gastando</div>
            <div className="font-mono text-lg font-bold text-red leading-tight">R$ {MONO4(pulse.perMinute.expense)}</div>
            <div className="text-[10px] text-white/20 mt-1">{BRL(pulse.perHour.expense)}/hora</div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="border-t border-white/6 pt-4 space-y-2.5">
          {[
            {stripe:'#34C759',name:'Receitas fixas',  badge:'FX',desc:`${BRL(fixed.filter((f:any)=>f.type==='income').reduce((s:any,f:any)=>s+Number(f.amount),0))} ÷ ${pulse.meta.minsTotal.toLocaleString('pt-BR')} min`,val:`+${MONO4(pulse.breakdown.fixedIM)}/min`,color:'text-green'},
            {stripe:'#FF3B30',name:'Gastos fixos',    badge:'FX',desc:`${BRL(fixed.filter((f:any)=>f.type==='expense').reduce((s:any,f:any)=>s+Number(f.amount),0))} ÷ ${pulse.meta.minsTotal.toLocaleString('pt-BR')} min`,val:`−${MONO4(pulse.breakdown.fixedEM)}/min`,color:'text-red'},
            ...(pulse.breakdown.varIM>0?[{stripe:'#007AFF',name:'Receitas variáveis',badge:'VAR',desc:`${BRL(transactions.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0))} ÷ ${pulse.meta.minsLeft.toLocaleString('pt-BR')} min restantes`,val:`+${MONO4(pulse.breakdown.varIM)}/min`,color:'text-green'}]:[]),
            ...(pulse.breakdown.varEM>0?[{stripe:'#FF9500',name:'Gastos variáveis',  badge:'VAR',desc:`${BRL(transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0))} ÷ ${pulse.meta.minsLeft.toLocaleString('pt-BR')} min restantes`,val:`−${MONO4(pulse.breakdown.varEM)}/min`,color:'text-red'}]:[]),
          ].map((r,i)=>(
            <div key={i} className="flex items-center gap-2.5">
              <div className="w-0.5 h-7 rounded-full flex-shrink-0" style={{background:r.stripe}}/>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white/55 flex items-center gap-1.5">
                  {r.name}
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{background:r.badge==='FX'?'rgba(255,255,255,.08)':'rgba(0,122,255,.3)',color:r.badge==='FX'?'rgba(255,255,255,.3)':'#5AC8FA'}}>
                    {r.badge}
                  </span>
                </div>
                <div className="text-[10px] text-white/20 mt-0.5 font-mono truncate">{r.desc}</div>
              </div>
              <div className={`font-mono text-xs font-bold flex-shrink-0 ${r.color}`}>{r.val}</div>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex justify-between text-[10px] font-semibold text-white/20 mb-1.5">
            <span>DIA {pulse.meta.dayNum}/{pulse.meta.daysTotal} — {Math.round(pulse.meta.pct*100)}% do mês</span>
            <span className="font-mono">{pulse.meta.minsPassed.toLocaleString('pt-BR')} / {pulse.meta.minsTotal.toLocaleString('pt-BR')} min</span>
          </div>
          <div className="h-1 bg-white/7 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{width:`${pulse.meta.pct*100}%`,background:'linear-gradient(90deg,#34C759,#5AC8FA)'}}/>
          </div>
        </div>
      </div>

      {/* CATEGORIES */}
      {expByCat.length>0&&(
        <>
          <div className="text-xl font-black text-ink tracking-tight mb-3">Gastos variáveis</div>
          <div className="flex gap-3 overflow-x-auto pb-2 mb-5">
            {expByCat.map(([cat,val]:any)=>{
              const info=CATS[cat]||{icon:'•',name:cat,color:'#8E8E93'}
              return(
                <div key={cat} className="flex-shrink-0 bg-white rounded-chip p-3.5 shadow-card min-w-[110px]">
                  <div className="text-2xl mb-2">{info.icon}</div>
                  <div className="text-[10px] font-semibold text-muted mb-1">{info.name}</div>
                  <div className="text-sm font-black text-ink">{BRL(val)}</div>
                  <div className="h-1 bg-fill rounded-full mt-2 overflow-hidden">
                    <div className="h-full rounded-full" style={{width:`${(val/maxCat)*100}%`,background:info.color}}/>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* RECENT TRANSACTIONS */}
      <div className="text-xl font-black text-ink tracking-tight mb-3">Recentes</div>
      <div className="card animate-fade-up">
        {transactions.slice(0,8).map((t:any)=>{
          const info=CATS[t.category]||{icon:'•',name:t.category,color:'#8E8E93'}
          return(
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-surface transition-colors">
              <div className="w-10 h-10 rounded-[12px] flex items-center justify-center text-lg flex-shrink-0"
                style={{background:`${info.color}18`}}>
                {info.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-ink truncate">{t.name}</div>
                <div className="text-xs text-muted mt-0.5 flex items-center gap-1.5">
                  {info.name}
                  <span className="text-[9px] font-bold bg-brand/10 text-brand px-1.5 py-0.5 rounded">VAR</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`text-sm font-bold ${t.type==='income'?'text-green':'text-ink'}`}>
                  {t.type==='income'?'+':'−'}{BRL(Number(t.amount))}
                </div>
                <div className="text-xs text-muted mt-0.5">
                  {new Date(t.date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}
                </div>
              </div>
            </div>
          )
        })}
        {transactions.length===0&&(
          <div className="p-8 text-center text-muted text-sm">
            Nenhuma transação este mês.<br/>
            <a href="/transactions" className="text-brand font-semibold">Adicionar lançamento →</a>
          </div>
        )}
      </div>

    </div>
  )
}
