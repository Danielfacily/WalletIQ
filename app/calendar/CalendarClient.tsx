'use client'
import { useState, useEffect, useCallback } from 'react'

/* ── helpers ─────────────────────────────────────────────── */
const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const BRLK = (v: number) =>
  Math.abs(v) >= 1000
    ? `R$\u202F${(v / 1000).toFixed(1)}k`
    : BRL(v)

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAYS_PT   = ['D','S','T','Q','Q','S','S']

const CAT_ICON: Record<string, string> = {
  food:'🍔', salary:'💼', freelance:'💻', transport:'🚗',
  subscription:'📱', housing:'🏠', health:'💊', investment:'📈',
  education:'📚', other_in:'💰', other_ex:'🛒', leisure:'🎮',
}

/* ── types ───────────────────────────────────────────────── */
interface DayData {
  day: number
  net: number | null
  varInc: number
  varExp: number
  fixedNet: number
  txs: { id:string; name:string; type:string; category:string; amount:number; date:string }[]
  isFuture: boolean
  isToday: boolean
}
interface Summary {
  totalNet: number
  totalVarInc: number
  totalVarExp: number
  fixedInc: number
  fixedExp: number
  projectedInc: number
  projectedExp: number
  posDays: number
  negDays: number
  txCount: number
  elapsedDays: number
}
interface CalendarData {
  year: number
  month: number
  daysInMonth: number
  days: DayData[]
  summary: Summary
}

/* ── RING SVG (mini) ─────────────────────────────────────── */
function MiniRing({ pct, color, size = 52 }: { pct: number; color: string; size?: number }) {
  const cx = size / 2, cy = size / 2, r = size * .36, c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={size * .13}/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={size * .13}
        strokeDasharray={`${c * Math.min(Math.max(pct, 0), 1)} ${c}`}
        strokeDashoffset={c * .25} strokeLinecap="round"/>
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize={size * .24} fontWeight="800" fontFamily="Figtree,sans-serif" fill="white">
        {Math.round(Math.min(pct, 1) * 100)}
      </text>
    </svg>
  )
}

/* ── SKELETON ────────────────────────────────────────────── */
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-white/5 ${className}`}/>
  )
}

/* ── MAIN COMPONENT ──────────────────────────────────────── */
export default function CalendarClient() {
  const now = new Date()
  const [year,   setYear]   = useState(now.getFullYear())
  const [month,  setMonth]  = useState(now.getMonth() + 1) // 1-indexed
  const [period, setPeriod] = useState<'7D'|'30D'|'90D'|'custom'>('30D')
  const [selDay, setSelDay] = useState<number | null>(null)
  const [data,   setData]   = useState<CalendarData | null>(null)
  const [loading,setLoading]= useState(true)

  const fetchData = useCallback(async (y: number, m: number) => {
    setLoading(true)
    setSelDay(null)
    try {
      const res = await fetch(`/api/calendar?year=${y}&month=${m}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(year, month) }, [year, month, fetchData])

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const firstDOW   = data ? new Date(year, month - 1, 1).getDay() : 0
  const selDayData = data?.days?.find(d => d.day === selDay)
  const s          = data?.summary

  // Save pct for ring
  const savePct = s && s.projectedInc > 0
    ? Math.max(0, (s.projectedInc - s.projectedExp) / s.projectedInc)
    : 0

  return (
    <div className="min-h-screen" style={{ background: '#0f0f13', fontFamily: 'Figtree, sans-serif' }}>
      <div className="max-w-lg mx-auto pb-10">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="text-2xl font-black text-white tracking-tight">Calendário</div>
          <div className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.4)' }}>
            {MONTHS_PT[month - 1]} {year}
          </div>
        </div>

        {/* ── PERIOD TABS ── */}
        <div className="flex gap-1 px-5 mb-4">
          {(['7D','30D','90D','custom'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: period === p ? 'rgba(255,255,255,.1)' : 'transparent',
                color: period === p ? 'white' : 'rgba(255,255,255,.3)',
                fontFamily: 'Figtree, sans-serif',
                border: 'none',
                cursor: 'pointer',
              }}>
              {p === 'custom' ? 'Personalizar' : p}
            </button>
          ))}
        </div>

        {/* ── SUMMARY CARD ── */}
        <div className="mx-5 mb-4 rounded-2xl overflow-hidden"
          style={{ background: '#18181f', border: '1px solid #2a2a38' }}>

          {/* Card header */}
          <div className="flex items-start justify-between px-5 pt-5 pb-3">
            <div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                Análise Financeira
                <span className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.3)' }}>
                  ⓘ
                </span>
              </div>
              {loading ? <Skeleton className="mt-1 h-3 w-32"/> :
                <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,.3)' }}>
                  Saldo de {period === '7D'?'7 dias':period==='30D'?'30 dias':'90 dias'} &nbsp;·&nbsp; {s?.txCount ?? 0} transações
                </div>
              }
            </div>
            <div className="flex gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm cursor-pointer"
                style={{ background: '#1e1e28', border: '1px solid #2a2a38', color: 'rgba(255,255,255,.3)' }}>
                📊
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm cursor-pointer"
                style={{ background: '#1e1e28', border: '1px solid #3b82f6', color: '#3b82f6' }}>
                📅
              </div>
            </div>
          </div>

          {/* Total PNL */}
          <div className="px-5 pb-4">
            {loading ? <Skeleton className="h-10 w-40"/> : (
              <div className="text-4xl font-black tracking-tight"
                style={{
                  color: !s ? 'rgba(255,255,255,.3)'
                    : s.totalNet >= 0 ? '#00c896' : '#ff4d6a',
                  fontFamily: 'DM Mono, monospace',
                }}>
                {s ? (s.totalNet >= 0 ? '+' : '') + BRL(s.totalNet) : 'R$ 0,00'}
              </div>
            )}
          </div>

          {/* Mini rings row */}
          {!loading && s && (
            <div className="flex justify-around items-center px-5 pb-4 pt-1"
              style={{ borderTop: '1px solid #2a2a38' }}>
              <div className="flex flex-col items-center gap-1.5">
                <MiniRing pct={s.projectedInc > 0 ? s.projectedInc / (s.projectedInc * 1.3) : 0} color="#00c896" size={52}/>
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,.3)' }}>Receita</div>
                <div className="text-xs font-bold" style={{ color: '#00c896', fontFamily: 'DM Mono,monospace' }}>+{BRLK(s.projectedInc)}</div>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <MiniRing pct={savePct} color="#3b82f6" size={64}/>
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,.3)' }}>Poupança</div>
                <div className="text-xs font-bold" style={{ color: '#3b82f6', fontFamily: 'DM Mono,monospace' }}>{Math.round(savePct * 100)}%</div>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <MiniRing pct={s.projectedInc > 0 ? s.projectedExp / s.projectedInc : 0} color="#ff4d6a" size={52}/>
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,.3)' }}>Gasto</div>
                <div className="text-xs font-bold" style={{ color: '#ff4d6a', fontFamily: 'DM Mono,monospace' }}>−{BRLK(s.projectedExp)}</div>
              </div>
            </div>
          )}

          {/* Month nav */}
          <div className="flex items-center justify-center gap-6 py-3"
            style={{ borderTop: '1px solid #2a2a38' }}>
            <button onClick={prevMonth} className="text-white/30 hover:text-white transition-colors text-lg"
              style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'Figtree,sans-serif' }}>
              ◀
            </button>
            <div className="text-sm font-bold text-white" style={{ minWidth: 90, textAlign: 'center', fontFamily: 'DM Mono,monospace' }}>
              {year}-{String(month).padStart(2, '0')}
            </div>
            <button onClick={nextMonth} className="text-white/30 hover:text-white transition-colors text-lg"
              style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'Figtree,sans-serif' }}>
              ▶
            </button>
          </div>

          {/* ── CALENDAR GRID ── */}
          <div className="px-3 pb-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS_PT.map((d, i) => (
                <div key={i} className="text-center text-xs font-semibold py-1"
                  style={{ color: 'rgba(255,255,255,.2)' }}>{d}</div>
              ))}
            </div>

            {/* Day cells */}
            {loading ? (
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-xl"/>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1.5">
                {/* Empty offset cells */}
                {Array.from({ length: firstDOW }).map((_, i) => (
                  <div key={`e${i}`}/>
                ))}

                {/* Day cells */}
                {(data?.days ?? []).map(d => {
                  const isSelected = selDay === d.day
                  const net = d.net ?? 0
                  const hasTx = d.txs.length > 0

                  let bg = 'transparent'
                  let borderColor = 'transparent'
                  if (!d.isFuture) {
                    if (net > 0)  bg = 'rgba(0,200,150,.1)'
                    if (net < 0)  bg = 'rgba(255,77,106,.1)'
                  }
                  if (d.isToday)   borderColor = '#3b82f6'
                  if (isSelected)  borderColor = 'rgba(255,255,255,.4)'

                  const valColor = net > 0 ? '#00c896' : net < 0 ? '#ff4d6a' : 'rgba(255,255,255,.18)'
                  const numColor = d.isToday ? '#3b82f6' : isSelected ? 'white' : 'rgba(255,255,255,.45)'

                  return (
                    <div key={d.day}
                      onClick={() => !d.isFuture && setSelDay(selDay === d.day ? null : d.day)}
                      style={{
                        background: bg,
                        border: `1px solid ${borderColor}`,
                        borderRadius: 10,
                        aspectRatio: '1',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        cursor: d.isFuture ? 'default' : 'pointer',
                        opacity: d.isFuture ? .3 : 1,
                        position: 'relative',
                        transition: 'all .12s',
                        minHeight: 42,
                      }}>
                      {/* Day number */}
                      <div style={{ fontSize: 11, fontWeight: 700, color: numColor, lineHeight: 1, marginBottom: 2 }}>
                        {d.day}
                      </div>
                      {/* Value */}
                      {!d.isFuture && (
                        <div style={{ fontSize: 8, fontWeight: 600, color: valColor, fontFamily: 'DM Mono,monospace', lineHeight: 1 }}>
                          {hasTx
                            ? (net > 0 ? '+' : net < 0 ? '−' : '') + (Math.abs(net) >= 1000
                                ? `${(Math.abs(net)/1000).toFixed(1)}k`
                                : Math.abs(net).toFixed(0))
                            : net !== 0 ? (net > 0 ? '+' : '−') + Math.abs(net).toFixed(0) : '0'
                          }
                        </div>
                      )}
                      {/* Activity dot */}
                      {hasTx && !d.isFuture && (
                        <div style={{
                          position: 'absolute', bottom: 3,
                          width: 4, height: 4, borderRadius: '50%',
                          background: net > 0 ? '#00c896' : net < 0 ? '#ff4d6a' : 'rgba(255,255,255,.2)',
                        }}/>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Legend */}
            <div className="flex justify-center gap-5 mt-4">
              {[
                { label: 'Positivo',     bg: 'rgba(0,200,150,.1)',  border: '#00c896' },
                { label: 'Negativo',     bg: 'rgba(255,77,106,.1)', border: '#ff4d6a' },
                { label: 'Sem movimento',bg: 'transparent',         border: '#2a2a38' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: l.bg, border: `1px solid ${l.border}` }}/>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,.25)', fontWeight: 600 }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── DAY DETAIL PANEL ── */}
        {selDay && selDayData && (
          <div className="mx-5 mb-4 rounded-2xl overflow-hidden"
            style={{ background: '#18181f', border: '1px solid #2a2a38', animation: 'slideUp .2s ease' }}>
            <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid #2a2a38' }}>
              <div className="flex items-center gap-2">
                <div className="text-sm font-bold text-white">
                  {selDay} de {MONTHS_PT[month - 1]}
                </div>
                {selDayData.isToday && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(59,130,246,.15)', color: '#3b82f6' }}>
                    HOJE
                  </span>
                )}
              </div>
              <div className="text-base font-black"
                style={{
                  fontFamily: 'DM Mono,monospace',
                  color: selDayData.net === null ? 'rgba(255,255,255,.3)'
                    : selDayData.net >= 0 ? '#00c896' : '#ff4d6a',
                }}>
                {selDayData.net !== null
                  ? (selDayData.net >= 0 ? '+' : '') + BRL(selDayData.net)
                  : '—'
                }
              </div>
            </div>

            {/* Fixed baseline info */}
            <div className="px-4 py-2 flex justify-between"
              style={{ background: 'rgba(255,255,255,.02)', borderBottom: '1px solid #1e1e28' }}>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,.25)' }}>Base fixa diluída</span>
              <span className="text-xs font-mono font-semibold"
                style={{ color: selDayData.fixedNet >= 0 ? 'rgba(0,200,150,.5)' : 'rgba(255,77,106,.5)', fontFamily: 'DM Mono,monospace' }}>
                {selDayData.fixedNet >= 0 ? '+' : ''}{BRL(selDayData.fixedNet)}/dia
              </span>
            </div>

            {/* Transactions */}
            {selDayData.txs.length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: 'rgba(255,255,255,.25)' }}>
                Nenhuma transação variável neste dia
              </div>
            ) : (
              selDayData.txs.map((tx, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < selDayData.txs.length - 1 ? '1px solid rgba(42,42,56,.5)' : 'none' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: tx.type === 'income' ? 'rgba(0,200,150,.12)' : 'rgba(255,77,106,.12)' }}>
                    {CAT_ICON[tx.category] ?? '💳'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{tx.name}</div>
                    <div className="text-xs capitalize mt-0.5" style={{ color: 'rgba(255,255,255,.3)' }}>
                      {tx.category.replace('_', ' ')}
                    </div>
                  </div>
                  <div className="text-sm font-bold flex-shrink-0"
                    style={{
                      color: tx.type === 'income' ? '#00c896' : '#ff4d6a',
                      fontFamily: 'DM Mono,monospace',
                    }}>
                    {tx.type === 'income' ? '+' : '−'}{BRL(Number(tx.amount))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── KPI GRID ── */}
        <div className="grid grid-cols-2 gap-3 mx-5">
          {[
            {
              label: 'Receitas', icon: '📈',
              count: loading ? '...' : `${(data?.days?.flatMap(d=>d.txs).filter(t=>t.type==='income').length ?? 0)} transações`,
              value: loading ? '...' : `+${BRL(s?.projectedInc ?? 0)}`,
              color: '#00c896',
            },
            {
              label: 'Gastos', icon: '📉',
              count: loading ? '...' : `${(data?.days?.flatMap(d=>d.txs).filter(t=>t.type==='expense').length ?? 0)} transações`,
              value: loading ? '...' : `−${BRL(s?.projectedExp ?? 0)}`,
              color: '#ff4d6a',
            },
            {
              label: 'Dias positivos', icon: '🟢',
              count: loading ? '...' : `de ${s?.elapsedDays ?? 0} dias`,
              value: loading ? '...' : `${s?.posDays ?? 0} dias`,
              color: '#00c896',
            },
            {
              label: 'Dias negativos', icon: '🔴',
              count: loading ? '...' : `de ${s?.elapsedDays ?? 0} dias`,
              value: loading ? '...' : `${s?.negDays ?? 0} dias`,
              color: '#ff4d6a',
            },
          ].map(k => (
            <div key={k.label} className="rounded-2xl p-4"
              style={{ background: '#18181f', border: '1px solid #2a2a38' }}>
              <div className="flex justify-between items-start mb-1">
                <div className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,.35)' }}>{k.label}</div>
                <span>{k.icon}</span>
              </div>
              <div className="text-xs mb-2" style={{ color: 'rgba(255,255,255,.2)' }}>{k.count}</div>
              <div className="text-xl font-black" style={{ color: k.color, fontFamily: 'DM Mono,monospace' }}>
                {k.value}
              </div>
            </div>
          ))}
        </div>

        {/* ── MONTH HEATMAP BAR ── */}
        {!loading && data && (
          <div className="mx-5 mt-4 rounded-2xl p-4"
            style={{ background: '#18181f', border: '1px solid #2a2a38' }}>
            <div className="text-xs font-bold mb-3" style={{ color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Heatmap do mês
            </div>
            <div className="flex gap-1 flex-wrap">
              {data?.days?.map(d => {
                const net = d.net ?? 0
                const intensity = Math.min(Math.abs(net) / 500, 1)
                const bg = d.isFuture ? 'rgba(255,255,255,.03)'
                  : net > 0 ? `rgba(0,200,150,${0.1 + intensity * 0.5})`
                  : net < 0 ? `rgba(255,77,106,${0.1 + intensity * 0.5})`
                  : 'rgba(255,255,255,.04)'
                return (
                  <div key={d.day}
                    title={`Dia ${d.day}: ${d.net !== null ? BRL(d.net) : '—'}`}
                    onClick={() => !d.isFuture && setSelDay(selDay === d.day ? null : d.day)}
                    style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: bg,
                      border: selDay === d.day ? '1px solid rgba(255,255,255,.4)' : '1px solid transparent',
                      cursor: d.isFuture ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700,
                      color: d.isFuture ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.35)',
                    }}>
                    {d.day}
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
