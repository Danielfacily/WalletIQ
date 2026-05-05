'use client'
import { useEffect, useState, useCallback } from 'react'

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>
      isMetaMask?: boolean
    }
  }
}

interface Wallet {
  id: string
  address: string
  label: string | null
  eth_balance: number
  last_synced_at: string
}

const short = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`
const ETH   = (v: number)    => `${Number(v).toFixed(4)} ETH`

export default function MetaMaskConnect() {
  const [wallets,    setWallets]    = useState<Wallet[]>([])
  const [loading,    setLoading]    = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [syncing,    setSyncing]    = useState<string | null>(null)
  const [removing,   setRemoving]   = useState<string | null>(null)
  const [error,      setError]      = useState<string | null>(null)
  const [success,    setSuccess]    = useState<string | null>(null)

  const fetchWallets = useCallback(async () => {
    const res  = await fetch('/api/metamask/wallets')
    const json = await res.json()
    setWallets(json.wallets ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchWallets() }, [fetchWallets])

  const connect = async () => {
    setError(null)
    setSuccess(null)
    if (!window.ethereum?.isMetaMask) {
      setError('MetaMask não encontrado. Instale a extensão em metamask.io')
      return
    }
    setConnecting(true)
    try {
      const accounts: string[] = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const address = accounts[0]
      if (!address) throw new Error('Nenhuma conta selecionada')

      const res  = await fetch('/api/metamask/wallets', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ address }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Erro ao salvar carteira')

      await syncWallet(address)
      await fetchWallets()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setConnecting(false)
    }
  }

  const syncWallet = async (address: string) => {
    setSyncing(address)
    setError(null)
    try {
      const res  = await fetch('/api/metamask/sync', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ address }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Erro na sincronização')
      setSuccess(`${json.imported} transação(ões) importada(s)`)
      await fetchWallets()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSyncing(null)
    }
  }

  const removeWallet = async (address: string) => {
    setRemoving(address)
    await fetch('/api/metamask/wallets', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ address }),
    })
    await fetchWallets()
    setRemoving(null)
  }

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div>
          <div className="text-base font-bold text-ink">MetaMask</div>
          <div className="text-xs text-muted mt-0.5">Conecte sua carteira Ethereum e importe transações</div>
        </div>
        <button
          onClick={connect}
          disabled={connecting}
          className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {connecting ? 'Conectando…' : '+ Conectar carteira'}
        </button>
      </div>

      {error && (
        <div className="mx-5 mt-3 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="mx-5 mt-3 px-4 py-3 rounded-xl bg-green-50 text-green-700 text-sm border border-green-100">
          ✓ {success}
        </div>
      )}

      {loading ? (
        <div className="px-5 py-6 text-sm text-muted text-center animate-pulse">Carregando…</div>
      ) : wallets.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <div className="text-3xl mb-2">🦊</div>
          <div className="text-sm font-medium text-ink mb-1">Nenhuma carteira conectada</div>
          <div className="text-xs text-muted">Conecte sua carteira MetaMask para importar transações Ethereum automaticamente</div>
        </div>
      ) : (
        <div>
          {wallets.map(w => (
            <div key={w.id} className="flex items-center justify-between px-5 py-4 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-lg">🦊</div>
                <div>
                  <div className="text-sm font-semibold text-ink font-mono">{short(w.address)}</div>
                  <div className="text-xs text-muted">{ETH(w.eth_balance)}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => syncWallet(w.address)}
                  disabled={syncing === w.address}
                  className="text-xs text-brand hover:opacity-70 disabled:opacity-40 transition-opacity"
                >
                  {syncing === w.address ? 'Sincronizando…' : 'Sincronizar'}
                </button>
                <button
                  onClick={() => removeWallet(w.address)}
                  disabled={removing === w.address}
                  className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors"
                >
                  {removing === w.address ? '…' : 'Remover'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
