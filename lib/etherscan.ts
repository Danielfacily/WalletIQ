const BASE = 'https://api.etherscan.io/api'

function key() {
  const k = process.env.ETHERSCAN_API_KEY
  if (!k) throw new Error('ETHERSCAN_API_KEY não configurada')
  return k
}

export async function getEthBalance(address: string): Promise<number> {
  const url = `${BASE}?module=account&action=balance&address=${address}&tag=latest&apikey=${key()}`
  const res  = await fetch(url, { next: { revalidate: 0 } })
  const json = await res.json()
  if (json.status !== '1') throw new Error(`Etherscan balance error: ${json.message}`)
  return Number(json.result) / 1e18
}

export interface EthTx {
  hash:        string
  from:        string
  to:          string
  value:       string   // in wei
  timeStamp:   string   // unix timestamp
  isError:     string
  functionName: string
  tokenSymbol?: string
  tokenDecimal?: string
}

export async function getNormalTxs(address: string, startBlock = 0): Promise<EthTx[]> {
  const url = `${BASE}?module=account&action=txlist&address=${address}&startblock=${startBlock}&endblock=99999999&sort=desc&apikey=${key()}`
  const res  = await fetch(url, { next: { revalidate: 0 } })
  const json = await res.json()
  if (json.status === '0' && json.message === 'No transactions found') return []
  if (json.status !== '1') throw new Error(`Etherscan txlist error: ${json.message}`)
  return json.result ?? []
}

export async function getErc20Txs(address: string, startBlock = 0): Promise<EthTx[]> {
  const url = `${BASE}?module=account&action=tokentx&address=${address}&startblock=${startBlock}&endblock=99999999&sort=desc&apikey=${key()}`
  const res  = await fetch(url, { next: { revalidate: 0 } })
  const json = await res.json()
  if (json.status === '0' && json.message === 'No transactions found') return []
  if (json.status !== '1') throw new Error(`Etherscan tokentx error: ${json.message}`)
  return json.result ?? []
}
