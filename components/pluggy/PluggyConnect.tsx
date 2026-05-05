'use client'
import { useEffect, useState, useCallback } from 'react'

interface Account {
  id: string
  name: string
  type: string
  balance: number
  currency: string
}
interface BankItem {
  id: string
  item_id: string
  connector_name: string
  status: string
  last_synced_at: string
  pluggy_accounts: Account[]
}

const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function PluggyConnect() {
  const [items, setItems]       = useState<BankItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [syncing, setSyncing]   = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    const res  = await fetch('/api/pluggy/items')
    const json = await res.json()
    setItems(json.items ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const openWidget = async () => {
    setError(null)
    setSyncing(true)
    try {
      const res  = await fetch('/api/pluggy/connect-token', { method: 'POST' })
      const json = await res.json()
      if (!json.connectToken) throw new Error(json.error ?? 'Erro ao obter token')

      const { PluggyConnect: Widget } = await import('pluggy-connect-sdk')
      const widget = new Widget({
        connectToken: json.connectToken,
        sandbox: true,
        onSuccess: async (itemData: any) => {
          const syncRes = await fetch('/api/pluggy/sync', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ itemId: itemData.item.id }),
          })
          const syncJson = await syncRes.json()
          if (!syncJson.ok) setError(syncJson.error ?? 'Erro na sincronização')
          await fetchItems()
          setSyncing(false)
        },
        onError: (err: any) => {
          setError(err?.message ?? 'Erro ao conectar banco')
          setSyncing(false)
        },
        onClose: () => setSyncing(false),
      })
      widget.init()
    } catch (e: any) {
      setError(e.message)
      setSyncing(false)
    }
  }

  const removeItem = async (itemId: string) => {
    setRemoving(itemId)
    await fetch('/api/pluggy/items', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ itemId }),
    })
    await fetchItems()
    setRemoving(null)
  }

  const statusLabel: Record<string, { text: string; color: string }> = {
    UPDATED:     { text: 'Sincronizado',  color: 'text-green-600 bg-green-50' },
    UPDATING:    { text: 'Atualizando…',  color: 'text-blue-600 bg-blue-50' },
    LOGIN_ERROR: { text: 'Erro de login', color: 'text-red-600 bg-red-50' },
    OUTDATED:    { text: 'Desatualizado', color: 'text-yellow-600 bg-yellow-50' },
  }

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div>
          <div className="text-base font-bold text-ink">Open Finance</div>
          <div className="text-xs text-muted mt-0.5">Conecte sua conta bancária automaticamente</div>
        </div>
        <button
          onClick={openWidget}
          disabled={syncing}
          className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {syncing ? 'Conectando…' : '+ Conectar banco'}
        </button>
      </div>

      {error && (
        <div className="mx-5 mt-3 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="px-5 py-6 text-sm text-muted text-center animate-pulse">Carregando…</div>
      ) : items.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <div className="text-3xl mb-2">🏦</div>
          <div className="text-sm font-medium text-ink mb-1">Nenhum banco conectado</div>
          <div className="text-xs text-muted">Clique em "Conectar banco" para importar transações automaticamente</div>
          <div className="mt-3 inline-block px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 text-xs font-medium">
            🧪 Modo sandbox — use os bancos de teste do Pluggy
          </div>
        </div>
      ) : (
        <div>
          {items.map(item => {
            const st = statusLabel[item.status] ?? { text: item.status, color: 'text-muted bg-fill' }
            const totalBalance = item.pluggy_accounts.reduce((s, a) => s + Number(a.balance), 0)
            return (
              <div key={item.id} className="border-b border-gray-50 last:border-0">
                <div className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-fill flex items-center justify-center text-lg">🏦</div>
                    <div>
                      <div className="text-sm font-semibold text-ink">{item.connector_name}</div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>
                        {st.text}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-bold text-ink">{BRL(totalBalance)}</div>
                      <div className="text-xs text-muted">{item.pluggy_accounts.length} conta(s)</div>
                    </div>
                    <button
                      onClick={() => removeItem(item.item_id)}
                      disabled={removing === item.item_id}
                      className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors"
                    >
                      {removing === item.item_id ? '…' : 'Remover'}
                    </button>
                  </div>
                </div>
                {item.pluggy_accounts.map(acc => (
                  <div key={acc.id} className="flex items-center justify-between px-5 py-2 bg-fill/40">
                    <div className="text-xs text-muted pl-13">{acc.name} <span className="opacity-50">· {acc.type}</span></div>
                    <div className="text-xs font-semibold text-ink">{BRL(Number(acc.balance))}</div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
