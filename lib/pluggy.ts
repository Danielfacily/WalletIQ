import Pluggy from 'pluggy-js'

let _client: Pluggy | null = null
let _clientExpiry = 0

export async function getPluggyClient(): Promise<Pluggy> {
  const now = Date.now()
  if (_client && now < _clientExpiry) return _client

  const res = await fetch('https://api.pluggy.ai/auth', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      clientId:     process.env.PLUGGY_CLIENT_ID!,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET!,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Pluggy auth failed (${res.status}): ${text}`)
  }

  const { apiKey } = await res.json() as { apiKey: string }
  _client = new Pluggy(apiKey)
  _clientExpiry = now + 60 * 60 * 1000  // apiKey is valid for ~1h
  return _client
}
