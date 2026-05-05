'use client'
import { useState, useEffect } from 'react'

const FX_META: Record<string,{flag:string;label:string}> = {
  'USD/BRL':{ flag:'🇺🇸', label:'Dólar'    },
  'EUR/BRL':{ flag:'🇪🇺', label:'Euro'     },
  'GBP/BRL':{ flag:'🇬🇧', label:'Libra'    },
  'BTC/BRL':{ flag:'₿',   label:'Bitcoin'  },
  'ARS/BRL':{ flag:'🇦🇷', label:'Peso AR'  },
  'CNY/BRL':{ flag:'🇨🇳', label:'Yuan'     },
}

const NEWS = [
  { tag:'Câmbio',   tagColor:'#007AFF', tagBg:'rgba(0,122,255,.1)',   source:'Reuters Brasil',   time:'há 12 min', title:'Dólar recua com CPI dos EUA abaixo do esperado', summary:'CPI americano em 3,4% alivia pressão sobre o Fed e favorece moedas emergentes como o real.', impact:'pos', impactLabel:'↑ Favorável ao BRL' },
  { tag:'Selic',    tagColor:'#FF9500', tagBg:'rgba(255,149,0,.1)',   source:'Banco Central',    time:'há 2h',     title:'Copom mantém Selic em 10,50% ao ano e sinaliza cautela', summary:'Decisão unânime. Comitê cita incerteza externa e necessidade de avaliar ritmo de desinflação.', impact:'neu', impactLabel:'Neutro · aguardar' },
  { tag:'Bolsa',    tagColor:'#34C759', tagBg:'rgba(52,199,89,.1)',   source:'B3',               time:'há 3h',     title:'Ibovespa sobe 1,2% liderado por bancos e commodities', summary:'Bradesco, Itaú e Vale puxaram a alta. Volume financeiro totalizou R$ 28,4 bilhões.', impact:'pos', impactLabel:'↑ Ibov +1,2%' },
  { tag:'Tesouro',  tagColor:'#AF52DE', tagBg:'rgba(175,82,222,.1)', source:'Tesouro Nacional', time:'há 5h',     title:'Tesouro IPCA+ 2035 oferece 6,12% ao ano — maior em 8 meses', summary:'Com prêmio de risco elevado, Tesouro IPCA+ se torna mais atrativo para investidores de longo prazo.', impact:'pos', impactLabel:'↑ Oportunidade' },
  { tag:'Inflação', tagColor:'#FF3B30', tagBg:'rgba(255,59,48,.1)',  source:'IBGE',             time:'há 1d',     title:'IPCA de março fica em 0,43%, acumulado em 12 meses sobe a 3,93%', summary:'Alimentos e habitação foram os maiores impactos. Resultado acima da mediana do mercado.', impact:'neg', impactLabel:'↓ Pressão inflacionária' },
  { tag:'PIB',      tagColor:'#5AC8FA', tagBg:'rgba(90,200,250,.1)', source:'FGV',              time:'há 1d',     title:'Monitor do PIB aponta crescimento de 2,1% no 1° trimestre de 2025', summary:'Setor de serviços cresceu 2,8%. Agropecuária recuou 0,3%. Indústria avançou 1,4%.', impact:'pos', impactLabel:'↑ Economia aquecida' },
]

export default function MarketClient() {
  const [fx, setFx]           = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/market')
      .then(r=>r.json())
      .then(d=>{ setFx(d); setLoading(false) })
      .catch(()=>setLoading(false))
    const t = setInterval(()=>{
      fetch('/api/market').then(r=>r.json()).then(setFx)
    }, 5*60*1000)
    return ()=>clearInterval(t)
  },[])

  const fmtRate=(pair:string,rate:number)=>{
    if(pair.startsWith('BTC')) return `R$\u202F${(rate/1000).toFixed(1)}k`
    if(pair.startsWith('ARS')) return rate.toFixed(4)
    return rate.toFixed(2)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-end justify-between mb-5">
        <div className="text-3xl font-black text-ink tracking-tight">Mercado</div>
        {fx?.fetchedAt&&(
          <div className="text-xs text-muted">
            atualizado {new Date(fx.fetchedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
          </div>
        )}
      </div>

      {/* FX STRIP */}
      <div className="text-xl font-black text-ink tracking-tight mb-3">Câmbio</div>
      {loading?(
        <div className="flex gap-3 mb-5 overflow-x-auto pb-1">
          {[1,2,3,4].map(i=><div key={i} className="flex-shrink-0 w-28 h-24 bg-white rounded-chip animate-pulse shadow-card"/>)}
        </div>
      ):(
        <div className="flex gap-3 mb-6 overflow-x-auto pb-1">
          {(fx?.rates||[]).map((r:any)=>{
            const meta=FX_META[r.pair]||{flag:'💱',label:r.code}
            const up=r.change>=0
            return(
              <div key={r.pair} className="flex-shrink-0 bg-white rounded-chip p-3.5 min-w-[110px] shadow-card">
                <div className="text-sm font-bold text-muted mb-1">{meta.flag} {meta.label}</div>
                <div className="text-xl font-black text-ink tracking-tight">{fmtRate(r.pair,r.rate)}</div>
                <div className={`text-xs font-bold mt-1 flex items-center gap-1 ${up?'text-green':'text-red'}`}>
                  {up?'▲':'▼'} {Math.abs(r.change).toFixed(2)}%
                </div>
                <div className="text-[9px] text-muted mt-1 font-mono">{r.pair}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* NEWS */}
      <div className="text-xl font-black text-ink tracking-tight mb-3">Economia</div>
      <div className="space-y-3">
        {NEWS.map((n,i)=>(
          <div key={i} className="card p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{color:n.tagColor,background:n.tagBg}}>
                {n.tag}
              </span>
              <span className="text-xs font-semibold text-muted">{n.source}</span>
              <span className="text-xs text-muted/60 ml-auto">{n.time}</span>
            </div>
            <div className="text-base font-bold text-ink leading-snug mb-1.5">{n.title}</div>
            <div className="text-sm text-muted leading-relaxed mb-2">{n.summary}</div>
            <div className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full ${n.impact==='pos'?'bg-green/10 text-green':n.impact==='neg'?'bg-red/10 text-red':'bg-fill text-muted'}`}>
              {n.impactLabel}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
