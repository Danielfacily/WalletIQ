import { NextResponse } from 'next/server'

let cache: any = null
let cachedAt   = 0
const TTL      = 5 * 60 * 1000

// Fallback rates (updated periodically as static baseline)
const FALLBACK_RATES = [
  { pair:'USD/BRL', code:'USD', name:'Dólar Americano/Real Brasileiro', rate:5.14, high:5.18, low:5.10, change:0.23, updated:'2025-05-06 10:00:00' },
  { pair:'EUR/BRL', code:'EUR', name:'Euro/Real Brasileiro',            rate:5.72, high:5.76, low:5.68, change:-0.12, updated:'2025-05-06 10:00:00' },
  { pair:'GBP/BRL', code:'GBP', name:'Libra Esterlina/Real Brasileiro', rate:6.71, high:6.75, low:6.67, change:0.08,  updated:'2025-05-06 10:00:00' },
  { pair:'BTC/BRL', code:'BTC', name:'Bitcoin/Real Brasileiro',         rate:469580, high:475000, low:462000, change:1.82, updated:'2025-05-06 10:00:00' },
  { pair:'ARS/BRL', code:'ARS', name:'Peso Argentino/Real Brasileiro',  rate:0.0054, high:0.0055, low:0.0053, change:-0.37, updated:'2025-05-06 10:00:00' },
  { pair:'CNY/BRL', code:'CNY', name:'Yuan Chinês/Real Brasileiro',     rate:0.71, high:0.72, low:0.70, change:0.14, updated:'2025-05-06 10:00:00' },
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
