'use client'
import { useState, useEffect } from 'react'

const FX_META: Record<string,{flag:string;label:string;desc:string}> = {
  'USD/BRL':{ flag:'🇺🇸', label:'Dólar',    desc:'Dólar Americano' },
  'EUR/BRL':{ flag:'🇪🇺', label:'Euro',     desc:'Euro'            },
  'GBP/BRL':{ flag:'🇬🇧', label:'Libra',    desc:'Libra Esterlina' },
  'BTC/BRL':{ flag:'₿',   label:'Bitcoin',  desc:'Bitcoin'         },
  'ARS/BRL':{ flag:'🇦🇷', label:'Peso AR',  desc:'Peso Argentino'  },
  'CNY/BRL':{ flag:'🇨🇳', label:'Yuan',     desc:'Yuan Chinês'     },
}

const NEWS = [
  { tag:'Câmbio',   tagColor:'#007AFF', tagBg:'rgba(0,122,255,.1)',   source:'Reuters Brasil',   time:'10 min', title:'Dólar recua com CPI dos EUA abaixo do esperado', summary:'CPI americano em 3,4% alivia pressão sobre o Fed e favorece moedas emergentes como o real.', impact:'pos', impactLabel:'↑ Favorável ao BRL' },
  { tag:'Selic',    tagColor:'#FF9500', tagBg:'rgba(255,149,0,.1)',   source:'Banco Central',    time:'2h',     title:'Copom mantém Selic em 10,50% ao ano e sinaliza cautela', summary:'Decisão unânime. Comitê cita incerteza externa e necessidade de avaliar ritmo de desinflação.', impact:'neu', impactLabel:'Neutro · aguardar' },
  { tag:'Bolsa',    tagColor:'#34C759', tagBg:'rgba(52,199,89,.1)',   source:'B3',               time:'3h',     title:'Ibovespa sobe 1,2% liderado por bancos e commodities', summary:'Bradesco, Itaú e Vale puxaram a alta. Volume financeiro totalizou R$ 28,4 bilhões.', impact:'pos', impactLabel:'↑ Ibov +1,2%' },
  { tag:'Tesouro',  tagColor:'#AF52DE', tagBg:'rgba(175,82,222,.1)', source:'Tesouro Nacional', time:'5h',     title:'Tesouro IPCA+ 2035 oferece 6,12% ao ano — maior em 8 meses', summary:'Com prêmio de risco elevado, Tesouro IPCA+ se torna mais atrativo para investidores de longo prazo.', impact:'pos', impactLabel:'↑ Oportunidade' },
  { tag:'Inflação', tagColor:'#FF3B30', tagBg:'rgba(255,59,48,.1)',  source:'IBGE',             time:'1d',     title:'IPCA de março fica em 0,43%, acumulado em 12 meses sobe a 3,93%', summary:'Alimentos e habitação foram os maiores impactos. Resultado acima da mediana do mercado.', impact:'neg', impactLabel:'↓ Pressão inflacionária' },
  { tag:'PIB',      tagColor:'#5AC8FA', tagBg:'rgba(90,200,250,.1)', source:'FGV',              time:'1d',     title:'Monitor do PIB aponta crescimento de 2,1% no 1° trimestre', summary:'Setor de serviços cresceu 2,8%. Agropecuária recuou 0,3%. Indústria avançou 1,4%.', impact:'pos', impactLabel:'↑ Economia aquecida' },
]

function fmtRate(pair: string, rate: number) {
  if (pair.startsWith('BTC')) {
    if (rate >= 1000) return `R$ ${(rate/1000).toFixed(1)}k`
    return `R$ ${rate.toFixed(0)}`
  }
  if (pair.startsWith('ARS')) return rate.toFixed(4)
  return rate.toFixed(2)
}

export default function MarketClient() {
  const [fx, setFx]           = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [selected, setSelected] = useState<any | null>(null)

  const fetchRates = () => {
    fetch('/api/market')
      .then(r => {
        if (!r.ok) throw new Error(`Erro ${r.status}`)
        return r.json()
      })
      .then(d => {
        setFx(d)
        if (d.error) setError(d.error)
        else setError(null)
        setLoading(false)
      })
      .catch(err => {
        setError('Não foi possível carregar as cotações. Verifique sua conexão.')
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchRates()
    const t = setInterval(fetchRates, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [])

  const rates: any[] = fx?.rates ?? []

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div className="text-3xl font-black text-ink tracking-tight">Mercado</div>
        <div className="text-right">
          {fx?.fetchedAt && (
            <div className="text-xs text-muted">
              {new Date(fx.fetchedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
            </div>
          )}
          {fx?.source === 'live' && (
            <div className="flex items-center gap-1 justify-end">
              <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse inline-block"/>
              <span className="text-[10px] text-green font-semibold">AO VIVO</span>
            </div>
          )}
          {fx?.source === 'fallback' && (
            <div className="text-[10px] text-muted">Dados de referência</div>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
          <span className="text-base">⚠️</span>
          <div>
            <div className="text-sm font-semibold text-orange-700">{error}</div>
            <button onClick={fetchRates} className="text-xs text-orange-600 underline mt-0.5">Tentar novamente</button>
          </div>
        </div>
      )}

      {/* FX GRID */}
      <div className="text-xl font-black text-ink tracking-tight mb-3">Câmbio</div>
      {loading ? (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-24 bg-white rounded-chip animate-pulse shadow-card"/>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 mb-6">
          {rates.map((r: any) => {
            const meta = FX_META[r.pair] ?? { flag:'💱', label:r.code, desc:r.name }
            const up   = r.change >= 0
            const isSelected = selected?.pair === r.pair
            return (
              <button
                key={r.pair}
                onClick={() => setSelected(isSelected ? null : r)}
                className={`bg-white rounded-chip p-3.5 shadow-card text-left transition-all hover:shadow-md
                  ${isSelected ? 'ring-2 ring-brand/30' : ''}`}
              >
                <div className="text-sm font-bold text-muted mb-1 flex items-center gap-1">
                  <span>{meta.flag}</span>
                  <span>{meta.label}</span>
                </div>
                <div className="text-xl font-black text-ink tracking-tight leading-tight">
                  {fmtRate(r.pair, r.rate)}
                </div>
                <div className={`text-xs font-bold mt-1.5 flex items-center gap-0.5 ${up ? 'text-green-600' : 'text-red-600'}`}>
                  {up ? '▲' : '▼'} {Math.abs(r.change).toFixed(2)}%
                </div>
                <div className="text-[9px] text-muted mt-1 font-mono">{r.pair}</div>
              </button>
            )
          })}
        </div>
      )}

      {/* Detail card */}
      {selected && (
        <div className="card p-5 mb-6 border-2 border-brand/20">
          {(() => {
            const meta = FX_META[selected.pair] ?? { flag:'💱', label:selected.code, desc:selected.name }
            const up   = selected.change >= 0
            return (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-2xl">{meta.flag}</div>
                  <div>
                    <div className="text-base font-black text-ink">{meta.desc}</div>
                    <div className="text-xs text-muted">{selected.pair}</div>
                  </div>
                  <button onClick={() => setSelected(null)} className="ml-auto text-muted text-xl hover:text-ink">×</button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-surface rounded-xl p-3 text-center">
                    <div className="text-xs text-muted mb-0.5">Compra</div>
                    <div className="text-base font-black text-ink">{fmtRate(selected.pair, selected.rate)}</div>
                  </div>
                  <div className="bg-surface rounded-xl p-3 text-center">
                    <div className="text-xs text-muted mb-0.5">Máxima</div>
                    <div className="text-sm font-bold text-green-600">{fmtRate(selected.pair, selected.high)}</div>
                  </div>
                  <div className="bg-surface rounded-xl p-3 text-center">
                    <div className="text-xs text-muted mb-0.5">Mínima</div>
                    <div className="text-sm font-bold text-red-600">{fmtRate(selected.pair, selected.low)}</div>
                  </div>
                </div>
                <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-xl ${up ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  <span className="font-bold">{up ? '▲' : '▼'} {Math.abs(selected.change).toFixed(2)}%</span>
                  <span className="text-sm">hoje</span>
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* Calculadora de câmbio rápida */}
      <CurrencyCalc rates={rates} />

      {/* NEWS */}
      <div className="text-xl font-black text-ink tracking-tight mb-3 mt-6">Economia</div>
      <div className="space-y-3">
        {NEWS.map((n, i) => (
          <div key={i} className="card p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{color:n.tagColor,background:n.tagBg}}>
                {n.tag}
              </span>
              <span className="text-xs font-semibold text-muted">{n.source}</span>
              <span className="text-xs text-muted/60 ml-auto">há {n.time}</span>
            </div>
            <div className="text-base font-bold text-ink leading-snug mb-1.5">{n.title}</div>
            <div className="text-sm text-muted leading-relaxed mb-2">{n.summary}</div>
            <div className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full
              ${n.impact==='pos'?'bg-green/10 text-green':n.impact==='neg'?'bg-red/10 text-red':'bg-fill text-muted'}`}>
              {n.impactLabel}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CurrencyCalc({ rates }: { rates: any[] }) {
  const [amount, setAmount] = useState('100')
  const [from, setFrom]     = useState('USD/BRL')

  const rate = rates.find(r => r.pair === from)
  const brlValue = rate ? (parseFloat(amount) || 0) * rate.rate : null
  const meta = FX_META[from] ?? { flag:'💱', label:from.split('/')[0], desc:'' }

  if (rates.length === 0) return null

  return (
    <div className="card p-5">
      <div className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Calculadora de câmbio</div>
      <div className="flex gap-3 items-center mb-3">
        <div className="flex-1">
          <label className="text-xs text-muted">Valor</label>
          <input
            type="number"
            className="input mt-1"
            placeholder="100"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted">Moeda</label>
          <select
            className="input mt-1"
            value={from}
            onChange={e => setFrom(e.target.value)}
          >
            {rates.filter(r => !r.pair.startsWith('BTC')).map(r => {
              const m = FX_META[r.pair] ?? { flag:'', label: r.code, desc:'' }
              return <option key={r.pair} value={r.pair}>{m.flag} {m.label}</option>
            })}
          </select>
        </div>
      </div>
      {brlValue !== null && (
        <div className="bg-brand/8 rounded-xl p-4 text-center">
          <div className="text-xs text-muted mb-1">
            {parseFloat(amount) || 0} {meta.label} =
          </div>
          <div className="text-2xl font-black text-brand">
            {new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(brlValue)}
          </div>
          {rate && (
            <div className="text-xs text-muted mt-1">
              Taxa: {meta.flag} 1 = R$ {rate.rate.toFixed(4)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
