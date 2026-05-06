'use client'
import { useState, useEffect, useCallback } from 'react'

interface Alert {
  id: string
  type: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  category?: string
  amount?: number
  read: boolean
  dismissed: boolean
  created_at: string
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
  critical: { bg: 'bg-red-50',    border: 'border-red-200',    icon: '🚨', badge: 'bg-red-100 text-red-700' },
  warning:  { bg: 'bg-orange-50', border: 'border-orange-200', icon: '⚠️', badge: 'bg-orange-100 text-orange-700' },
  info:     { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: '💡', badge: 'bg-blue-100 text-blue-700' },
}

export default function AlertsPanel({ compact = false }: { compact?: boolean }) {
  const [alerts, setAlerts]   = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const fetchAlerts = useCallback(async () => {
    const res = await fetch('/api/alerts')
    const json = await res.json()
    setAlerts(json.alerts ?? [])
    setLoading(false)
  }, [])

  const generateAlerts = async () => {
    setGenerating(true)
    await fetch('/api/alerts', { method: 'POST' })
    await fetchAlerts()
    setGenerating(false)
  }

  const dismiss = async (id: string) => {
    await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'dismiss' }),
    })
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const markRead = async (id: string) => {
    await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'read' }),
    })
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a))
  }

  useEffect(() => {
    fetchAlerts()
    // Auto-generate on mount (debounced — won't duplicate due to server-side check)
    const timer = setTimeout(() => generateAlerts(), 2000)
    return () => clearTimeout(timer)
  }, [fetchAlerts])

  const unread = alerts.filter(a => !a.read)
  const visible = compact ? alerts.slice(0, 3) : alerts

  if (loading) {
    return (
      <div className={`${compact ? '' : 'p-6 max-w-2xl mx-auto'}`}>
        <div className="card p-6 text-center text-muted text-sm animate-pulse">Verificando alertas…</div>
      </div>
    )
  }

  if (compact) {
    if (alerts.length === 0) return null
    return (
      <div className="space-y-2 mb-5">
        {unread.slice(0, 2).map(alert => {
          const style = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info
          return (
            <div
              key={alert.id}
              className={`${style.bg} border ${style.border} rounded-xl px-4 py-3 flex items-start gap-3`}
              onClick={() => markRead(alert.id)}
            >
              <span className="text-base flex-shrink-0">{style.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-ink">{alert.title}</div>
                <div className="text-xs text-muted mt-0.5 line-clamp-2">{alert.message}</div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); dismiss(alert.id) }}
                className="text-muted hover:text-ink text-lg flex-shrink-0"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-ink">Alertas</h1>
          <p className="text-sm text-muted mt-0.5">
            {unread.length > 0 ? `${unread.length} alerta${unread.length > 1 ? 's' : ''} não lido${unread.length > 1 ? 's' : ''}` : 'Tudo em dia'}
          </p>
        </div>
        <button
          onClick={generateAlerts}
          disabled={generating}
          className="text-sm font-semibold text-brand hover:opacity-70 transition-opacity disabled:opacity-40"
        >
          {generating ? 'Analisando…' : '↻ Atualizar'}
        </button>
      </div>

      {alerts.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-base font-bold text-ink mb-1">Nenhum alerta no momento</div>
          <div className="text-sm text-muted">Sua saúde financeira está sob controle. Continue assim!</div>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(alert => {
            const style = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info
            return (
              <div
                key={alert.id}
                className={`${style.bg} border ${style.border} rounded-2xl p-4 ${!alert.read ? 'ring-1 ring-brand/20' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-xl flex-shrink-0 mt-0.5">{style.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-bold text-ink">{alert.title}</div>
                        {!alert.read && (
                          <span className="w-2 h-2 rounded-full bg-brand flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-sm text-muted leading-relaxed">{alert.message}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                          {alert.severity === 'critical' ? 'CRÍTICO' : alert.severity === 'warning' ? 'ATENÇÃO' : 'INFO'}
                        </span>
                        <span className="text-[10px] text-muted">
                          {new Date(alert.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => dismiss(alert.id)}
                    className="text-muted hover:text-ink text-lg flex-shrink-0"
                    title="Dispensar alerta"
                  >
                    ×
                  </button>
                </div>
                {!alert.read && (
                  <button
                    onClick={() => markRead(alert.id)}
                    className="mt-2 text-xs font-semibold text-brand hover:opacity-70 transition-opacity"
                  >
                    Marcar como lido →
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
