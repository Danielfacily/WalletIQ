import { PluggyClient } from 'pluggy-js'

let _client: PluggyClient | null = null

export function getPluggyClient(): PluggyClient {
  if (!_client) {
    _client = new PluggyClient({
      clientId:     process.env.PLUGGY_CLIENT_ID!,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET!,
    })
  }
  return _client
}
