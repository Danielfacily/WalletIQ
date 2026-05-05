'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PLANS = [
  {
    key:      'free',
    name:     'Free',
    price:    'R$ 0',
    period:   'para sempre',
    color:    '',
    featured: false,
    features: [
      { label:'1 banco conectado',      ok:true  },
      { label:'Ticker por minuto',      ok:true  },
      { label:'Câmbio e notícias',      ok:true  },
      { label:'Calendário financeiro',  ok:true  },
      { label:'5 msgs IA por dia',      ok:true  },
      { label:'Histórico 1 mês',        ok:true  },
      { label:'Bancos ilimitados',      ok:false },
      { label:'IA ilimitada',           ok:false },
      { label:'Histórico 12 meses',     ok:false },
      { label:'Relatórios PDF',         ok:false },
    ],
    cta: 'Plano atual',
  },
  {
    key:      'pro',
    name:     'Pro',
    price:    'R$ 19,90',
    period:   '/mês · cancele quando quiser',
    color:    '#007AFF',
    featured: true,
    features: [
      { label:'Bancos ilimitados',      ok:true },
      { label:'Ticker por minuto',      ok:true },
      { label:'Câmbio e notícias',      ok:true },
      { label:'Calendário financeiro',  ok:true },
      { label:'IA ilimitada',           ok:true },
      { label:'Histórico 12 meses',     ok:true },
      { label:'Relatórios PDF',         ok:true },
      { label:'Suporte prioritário',    ok:true },
      { label:'Família (5 pessoas)',    ok:false },
      { label:'Histórico 36 meses',     ok:false },
    ],
    cta: 'Assinar Pro',
  },
  {
    key:      'premium',
    name:     'Premium',
    price:    'R$ 39,90',
    period:   '/mês · família inclusa',
    color:    '#AF52DE',
    featured: false,
    features: [
      { label:'Tudo do Pro',            ok:true },
      { label:'5 membros da família',   ok:true },
      { label:'Histórico 36 meses',     ok:true },
      { label:'Suporte dedicado',       ok:true },
      { label:'Relatório IR (em breve)',ok:true },
      { label:'Apple Watch (em breve)', ok:true },
      { label:'IA ilimitada',           ok:true },
      { label:'Bancos ilimitados',      ok:true },
      { label:'Relatórios PDF',         ok:true },
      { label:'Câmbio e notícias',      ok:true },
    ],
    cta: 'Assinar Premium',
  },
]

export default function UpgradeClient({
  currentPlan,
  aiMsgsToday,
}: {
  currentPlan: string
  aiMsgsToday: number
}) {
  const router  = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleUpgrade = async (planKey: string) => {
    if (planKey === 'free' || planKey === currentPlan) return
    setLoading(planKey)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan: planKey }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      alert('Erro ao processar. Tente novamente.')
    } finally {
      setLoading(null)
    }
  }

  const handlePortal = async () => {
    setLoading('portal')
    const res  = await fetch('/api/stripe/portal', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    setLoading(null)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-3xl font-black text-ink tracking-tight mb-2">
          Escolha seu plano
        </div>
        <p className="text-muted">Comece grátis. Faça upgrade quando quiser.</p>
      </div>

      {/* Free limit warning */}
      {currentPlan === 'free' && aiMsgsToday >= 4 && (
        <div className="bg-orange/10 border border-orange/20 rounded-2xl p-4 mb-6 text-center">
          <div className="text-sm font-semibold text-orange">
            ⚠️ Você usou {aiMsgsToday}/5 mensagens de IA hoje.
            {aiMsgsToday >= 5 ? ' Limite atingido — faça upgrade para continuar.' : ' Quase no limite!'}
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {PLANS.map(plan => {
          const isCurrent = currentPlan === plan.key
          return (
            <div key={plan.key} className={`rounded-2xl p-6 border-2 transition-all
              ${plan.featured
                ? 'border-brand bg-brand/5'
                : 'border-gray-100 bg-white'
              }
              ${isCurrent ? 'ring-2 ring-offset-2 ring-brand' : ''}
            `}>
              {plan.featured && (
                <div className="text-xs font-bold text-brand uppercase tracking-widest mb-2">
                  ⭐ Mais popular
                </div>
              )}
              {isCurrent && (
                <div className="text-xs font-bold text-green uppercase tracking-widest mb-2">
                  ✓ Plano atual
                </div>
              )}

              <div className="text-sm font-bold text-muted uppercase tracking-wider mb-1">{plan.name}</div>
              <div className="text-3xl font-black text-ink tracking-tight mb-1">{plan.price}</div>
              <div className="text-xs text-muted mb-5">{plan.period}</div>

              <div className="border-t border-gray-100 pt-4 space-y-2.5 mb-6">
                {plan.features.map((f, i) => (
                  <div key={i} className={`text-sm flex items-start gap-2 ${f.ok ? 'text-ink' : 'text-muted/40'}`}>
                    <span className={`mt-0.5 flex-shrink-0 ${f.ok ? 'text-green' : 'text-muted/30'}`}>
                      {f.ok ? '✓' : '—'}
                    </span>
                    {f.label}
                  </div>
                ))}
              </div>

              <button
                onClick={() => isCurrent ? null : handleUpgrade(plan.key)}
                disabled={isCurrent || loading !== null}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all
                  ${isCurrent
                    ? 'bg-green/10 text-green cursor-default'
                    : plan.featured
                      ? 'bg-brand text-white hover:opacity-90'
                      : plan.key === 'premium'
                        ? 'bg-purple text-white hover:opacity-90'
                        : 'bg-surface text-muted cursor-default'
                  }
                  ${loading === plan.key ? 'opacity-60' : ''}
                `}
              >
                {loading === plan.key ? 'Processando...' : isCurrent ? '✓ Ativo' : plan.cta}
              </button>
            </div>
          )
        })}
      </div>

      {/* Manage subscription */}
      {currentPlan !== 'free' && (
        <div className="text-center">
          <button
            onClick={handlePortal}
            disabled={loading !== null}
            className="text-sm text-muted hover:text-ink transition-colors underline underline-offset-4"
          >
            {loading === 'portal' ? 'Abrindo...' : 'Gerenciar assinatura / cancelar →'}
          </button>
        </div>
      )}

      {/* FAQ */}
      <div className="mt-10 space-y-4">
        <div className="text-lg font-bold text-ink mb-4">Perguntas frequentes</div>
        {[
          { q:'Posso cancelar a qualquer momento?', a:'Sim. Cancele quando quiser pelo portal de assinatura. Você mantém o acesso até o fim do período pago.' },
          { q:'Como funciona o pagamento?', a:'Cobrança mensal recorrente via cartão de crédito. Processado com segurança pelo Stripe.' },
          { q:'O que acontece com meus dados se eu cancelar?', a:'Seus dados ficam salvos por 30 dias. Você pode reativar a qualquer momento. Após 30 dias, os dados são removidos.' },
          { q:'Tem desconto anual?', a:'Em breve! Será lançado desconto de 20% para plano anual.' },
        ].map((faq, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-card">
            <div className="text-sm font-bold text-ink mb-1.5">{faq.q}</div>
            <div className="text-sm text-muted leading-relaxed">{faq.a}</div>
          </div>
        ))}
      </div>

    </div>
  )
}
