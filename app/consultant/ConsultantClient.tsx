'use client'
import { useState, useRef, useEffect } from 'react'
import { BRL } from '@/lib/pulse'

const QUICK = ['Como está minha saúde financeira?','Onde posso economizar?','Dicas de investimento','Quanto posso gastar hoje?','Meta de poupança']

export default function ConsultantClient({ context, savePct, plan }: { context:any; savePct:number; plan:string }) {
  const [msgs,    setMsgs]    = useState([{ role:'ai', text:'Olá! 👋 Sou seu consultor de saúde financeira. Tenho acesso ao seu fluxo financeiro em tempo real. Como posso ajudar?', time:new Date() }])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [usage,   setUsage]   = useState<any>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(()=>{ ref.current?.scrollIntoView({behavior:'smooth'}) },[msgs,loading])

  const send = async (text:string) => {
    const t=text||input.trim()
    if(!t||loading) return
    setInput('')
    setMsgs(m=>[...m,{role:'user',text:t,time:new Date()}])
    setLoading(true)
    try {
      const res = await fetch('/api/ai',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          message:t, context,
          history:msgs.map(m=>({role:m.role==='user'?'user':'assistant',content:m.text}))
        })
      })
      const data = await res.json()

      if (res.status === 429 && data.upgrade) {
        setMsgs(m=>[...m,{
          role:'ai',
          text:`⚠️ ${data.message}\n\n[Fazer upgrade →](/upgrade)`,
          time:new Date()
        }])
      } else {
        setMsgs(m=>[...m,{role:'ai',text:data.reply||'Erro. Tente novamente.',time:new Date()}])
        if (data.usage) setUsage(data.usage)
      }
    } catch {
      setMsgs(m=>[...m,{role:'ai',text:'⚠️ Erro de conexão.',time:new Date()}])
    } finally { setLoading(false) }
  }

  const alertColor=savePct>=20?'#34C759':savePct>=10?'#FF9500':'#FF3B30'
  const alertText=savePct>=20?'✅ Saúde financeira boa':savePct>=10?'⚠️ Atenção necessária':'🚨 Alerta crítico'

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col" style={{height:'calc(100vh - 80px)'}}>
      <div className="text-3xl font-black text-ink tracking-tight mb-4">Consultor IA</div>

      {/* AI Hero */}
      <div className="bg-ink rounded-apple p-5 mb-4 shadow-dark">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand to-teal flex items-center justify-center text-2xl">🤖</div>
          <div>
            <div className="text-lg font-black text-white">Consultor IA</div>
            <div className="text-xs text-white/40">Análise em tempo real · {plan}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK.map(q=>(
            <button key={q} onClick={()=>send(q)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/9 border border-white/10 text-white/70 hover:bg-brand/30 hover:text-white transition-all">
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Insight */}
      <div className="bg-white rounded-xl p-4 mb-4 shadow-card" style={{borderLeft:`4px solid ${alertColor}`}}>
        <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{color:alertColor}}>{alertText}</div>
        <div className="text-sm text-ink">
          Poupança projetada: <strong style={{color:alertColor}}>{savePct}%</strong> da receita ·
          Saldo: <strong>{BRL(context.saldo_projetado)}</strong>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-0">
        {msgs.map((m,i)=>(
          <div key={i} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed
              ${m.role==='user'?'bg-brand text-white rounded-br-sm':'bg-white text-ink shadow-card rounded-bl-sm'}`}
              dangerouslySetInnerHTML={{__html:
                m.text.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br/>')
                +`<div style="font-size:10px;opacity:.45;margin-top:6px;text-align:right">${m.time.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>`
              }}/>
          </div>
        ))}
        {loading&&(
          <div className="flex justify-start">
            <div className="bg-white shadow-card rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
              {[0,1,2].map(i=><div key={i} className="w-2 h-2 rounded-full bg-muted animate-bounce" style={{animationDelay:`${i*.15}s`}}/>)}
            </div>
          </div>
        )}
        <div ref={ref}/>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&(e.preventDefault(),send(''))}
          placeholder="Perguntar ao consultor..."
          className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-ink outline-none focus:border-brand transition-colors shadow-card"/>
        <button onClick={()=>send('')} disabled={loading||!input.trim()}
          className="w-11 h-11 bg-brand rounded-full flex items-center justify-center text-white font-bold text-lg disabled:opacity-40 transition-opacity hover:opacity-90">
          ↑
        </button>
      </div>
    </div>
  )
}
