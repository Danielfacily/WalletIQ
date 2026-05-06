import { NextResponse } from 'next/server'

let cache: any = null
let cachedAt   = 0
const TTL      = 5 * 60 * 1000

const FALLBACK_RATES = [
  { pair:'USD/BRL', code:'USD', name:'Dólar Americano/Real Brasileiro', rate:5.74, high:5.78, low:5.70, change:0.18, updated:'2026-05-06 10:00:00' },
  { pair:'EUR/BRL', code:'EUR', name:'Euro/Real Brasileiro',            rate:6.32, high:6.36, low:6.28, change:-0.10, updated:'2026-05-06 10:00:00' },
  { pair:'GBP/BRL', code:'GBP', name:'Libra Esterlina/Real Brasileiro', rate:7.41, high:7.45, low:7.37, change:0.07, updated:'2026-05-06 10:00:00' },
  { pair:'BTC/BRL', code:'BTC', name:'Bitcoin/Real Brasileiro',         rate:502000, high:515000, low:495000, change:1.45, updated:'2026-05-06 10:00:00' },
  { pair:'ARS/BRL', code:'ARS', name:'Peso Argentino/Real Brasileiro',  rate:0.0052, high:0.0053, low:0.0051, change:-0.28, updated:'2026-05-06 10:00:00' },
  { pair:'CNY/BRL', code:'CNY', name:'Yuan Chinês/Real Brasileiro',     rate:0.79, high:0.80, low:0.78, change:0.12, updated:'2026-05-06 10:00:00' },
]

export async function GET() {
  if (cache && Date.now() - cachedAt < TTL) {
    return NextResponse.json(cache)
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(
      'https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,GBP-BRL,BTC-BRL,ARS-BRL,CNY-BRL',
      { signal: controller.signal, next: { revalidate: 300 } }
    )
    clearTimeout(timeout)

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json()
    const rates = Object.values(data).map((r: any) => ({
      pair:    `${r.code}/${r.codein}`,
      code:    r.code,
      name:    r.name,
      rate:    parseFloat(r.bid),
      high:    parseFloat(r.high),
      low:     parseFloat(r.low),
      change:  parseFloat(r.pctChange),
      updated: r.create_date,
    }))
    cache    = { rates, fetchedAt: new Date().toISOString(), source: 'live' }
    cachedAt = Date.now()
    return NextResponse.json(cache)
  } catch {
    // Return fallback data so the UI doesn't break
    const fallback = {
      rates: FALLBACK_RATES,
      fetchedAt: new Date().toISOString(),
      source: 'fallback',
      error: 'Cotações em tempo real indisponíveis — exibindo dados de referência.',
    }
    return NextResponse.json(fallback)
  }
}
