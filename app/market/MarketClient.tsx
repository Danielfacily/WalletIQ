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
  { tag:'Câmbio',   tagColor:'#007AFF', tagBg:'rgba(0,122,255,.1)',   source:'Reuters Brasil',   title:'Últimas notícias de câmbio e mercado de moedas',     summary:'Acompanhe as movimentações do dólar, euro e demais moedas em tempo real com análises da Reuters.', impact:'pos', impactLabel:'↑ Atualizado ao vivo', href:'https://br.reuters.com/business/finance/' },
  { tag:'Selic',    tagColor:'#FF9500', tagBg:'rgba(255,149,0,.1)',   source:'Banco Central',    title:'Decisões do Copom e política monetária brasileira',    summary:'Todas as atas e decisões do Comitê de Política Monetária, projeções de inflação e comunicados oficiais.', impact:'neu', impactLabel:'Fonte oficial BCB', href:'https://www.bcb.gov.br/controleinflacao/copom' },
  { tag:'Bolsa',    tagColor:'#34C759', tagBg:'rgba(52,199,89,.1)',   source:'B3',               title:'Ibovespa e mercado de capitais — dados em tempo real', summary:'Índices, ações, fundos imobiliários e ETFs. Acompanhe o desempenho completo da bolsa brasileira.', impact:'pos', impactLabel:'↑ Dados ao vivo B3', href:'https://www.b3.com.br/pt_br/market-data-e-indices/' },
  { tag:'Tesouro',  tagColor:'#AF52DE', tagBg:'rgba(175,82,222,.1)', source:'Tesouro Nacional', title:'Taxas do Tesouro Direto — IPCA+, Prefixado e Selic',   summary:'Consulte as taxas atualizadas diariamente para todos os títulos públicos disponíveis no Tesouro Direto.', impact:'pos', impactLabel:'↑ Taxas atualizadas', href:'https://www.tesourodireto.com.br/titulos/precos-e-taxas.htm' },
  { tag:'Inflação', tagColor:'#FF3B30', tagBg:'rgba(255,59,48,.1)',  source:'IBGE',             title:'IPCA, INPC e índices de preços — dados oficiais',      summary:'Indicadores de inflação do Instituto Brasileiro de Geografia e Estatística, atualizados mensalmente.', impact:'neg', impactLabel:'↓ Monitorar inflação', href:'https://www.ibge.gov.br/explica/inflacao.php' },
  { tag:'Análise',  tagColor:'#5AC8FA', tagBg:'rgba(90,200,250,.1)', source:'Valor Econômico',  title:'Análise macroeconômica e mercado financeiro',          summary:'Cobertura jornalística especializada em economia, finanças corporativas, investimentos e cenário internacional.', impact:'pos', impactLabel:'Aprofundar análise', href:'https://valor.globo.com/financas/' },
  { tag:'Renda',    tagColor:'#34C759', tagBg:'rgba(52,199,89,.1)',  source:'Infomoney',        title:'Renda fixa, ações e investimentos — educação financeira',summary:'Comparativos de rendimentos, análises de carteiras e conteúdo educacional sobre finanças pessoais.', impact:'pos', impactLabel:'↑ Aprender a investir', href:'https://www.infomoney.com.br/mercados/' },
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
          <a key={i} href={n.href} target="_blank" rel="noopener noreferrer"
            className="card p-4 hover:shadow-md transition-shadow block group">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{color:n.tagColor,background:n.tagBg}}>
                {n.tag}
              </span>
              <span className="text-xs font-semibold text-muted">{n.source}</span>
              <span className="text-xs text-brand/70 ml-auto font-semibold group-hover:text-brand transition-colors">↗ Acessar</span>
            </div>
            <div className="text-base font-bold text-ink leading-snug mb-1.5 group-hover:text-brand transition-colors">{n.title}</div>
            <div className="text-sm text-muted leading-relaxed mb-2">{n.summary}</div>
            <div className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full
              ${n.impact==='pos'?'bg-green/10 text-green':n.impact==='neg'?'bg-red/10 text-red':'bg-fill text-muted'}`}>
              {n.impactLabel}
            </div>
          </a>
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
