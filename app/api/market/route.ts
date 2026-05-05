import { NextResponse } from 'next/server'

let cache: any = null
let cachedAt   = 0
const TTL      = 5 * 60 * 1000

export async function GET() {
  if (cache && Date.now() - cachedAt < TTL) {
    return NextResponse.json(cache)
  }
  try {
    const res  = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,GBP-BRL,BTC-BRL,ARS-BRL,CNY-BRL', { next:{ revalidate:300 } })
    const data = await res.json()
    const rates = Object.values(data).map((r:any) => ({
      pair:    `${r.code}/${r.codein}`,
      code:    r.code,
      name:    r.name,
      rate:    parseFloat(r.bid),
      high:    parseFloat(r.high),
      low:     parseFloat(r.low),
      change:  parseFloat(r.pctChange),
      updated: r.create_date,
    }))
    cache    = { rates, fetchedAt: new Date().toISOString() }
    cachedAt = Date.now()
    return NextResponse.json(cache)
  } catch {
    return NextResponse.json({ error:'Falha ao buscar cotações' }, { status:500 })
  }
}
