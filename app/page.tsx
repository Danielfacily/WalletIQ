import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white font-sans">

      {/* NAV */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
        <div className="text-2xl font-black text-white tracking-tight">
          Wallet<span className="text-brand">IQ</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-sm font-semibold text-white/50 hover:text-white transition-colors">
            Entrar
          </Link>
          <Link href="/auth/register" className="bg-brand text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
            Começar grátis
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-8 pt-20 pb-28 text-center">
        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-xs font-bold text-teal uppercase tracking-widest mb-8">
          <span className="live-dot"/>
          Ao vivo · Saúde Financeira
        </div>
        <h1 className="text-6xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6">
          Seu dinheiro em<br/>
          <span className="text-brand">tempo real</span>
        </h1>
        <p className="text-xl text-white/40 max-w-xl mx-auto mb-10 leading-relaxed">
          O único app que calcula quanto você ganha e gasta <strong className="text-white/60">por minuto</strong>, com Open Finance automático e IA personalizada.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap mb-16">
          <Link href="/auth/register" className="bg-brand text-white font-bold text-lg px-8 py-4 rounded-2xl hover:opacity-90 transition-all hover:scale-105">
            Criar conta grátis
          </Link>
          <Link href="/auth/login" className="bg-white/8 border border-white/10 text-white font-semibold text-lg px-8 py-4 rounded-2xl hover:bg-white/12 transition-all">
            Já tenho conta
          </Link>
        </div>

        {/* Feature chips */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {[
            { label:'Open Finance', color:'text-green-400 bg-green-400/10 border-green-400/20' },
            { label:'IA Consultora', color:'text-blue-400 bg-blue-400/10 border-blue-400/20' },
            { label:'Ticker por Minuto', color:'text-orange-400 bg-orange-400/10 border-orange-400/20' },
            { label:'Câmbio ao Vivo', color:'text-purple-400 bg-purple-400/10 border-purple-400/20' },
          ].map(f=>(
            <span key={f.label} className={`text-xs font-bold px-4 py-2 rounded-full border ${f.color}`}>
              ✓ {f.label}
            </span>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-6xl mx-auto px-8 pb-28">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(f=>(
            <div key={f.title} className="bg-white/4 border border-white/8 rounded-2xl p-7 hover:bg-white/6 transition-colors">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-6xl mx-auto px-8 pb-28">
        <h2 className="text-4xl font-black text-center mb-4 tracking-tight">Como funciona</h2>
        <p className="text-white/40 text-center mb-14 text-lg">Três passos para ter controle total</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { n:'1', title:'Conecte seus bancos', desc:'Autentique via Open Finance. Nubank, Itaú, Bradesco, Inter, XP, BB, C6, Caixa — todos em um lugar.', color:'bg-brand' },
            { n:'2', title:'Cadastre seu orçamento fixo', desc:'Salário, aluguel, assinaturas. Eles são diluídos automaticamente em cada minuto do mês.', color:'bg-green' },
            { n:'3', title:'Monitore em tempo real', desc:'Veja o fluxo por minuto, acumulado por dia/semana/mês e consulte a IA para decisões melhores.', color:'bg-purple' },
          ].map(s=>(
            <div key={s.n} className="text-center">
              <div className={`w-14 h-14 ${s.color} rounded-2xl flex items-center justify-center text-white font-black text-2xl mx-auto mb-5`}>{s.n}</div>
              <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PLANS */}
      <section className="max-w-6xl mx-auto px-8 pb-28">
        <h2 className="text-4xl font-black text-center mb-4 tracking-tight">Planos simples</h2>
        <p className="text-white/40 text-center mb-14 text-lg">Comece grátis. Faça upgrade quando quiser.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map(p=>(
            <div key={p.name} className={`rounded-2xl p-7 ${p.featured?'bg-brand/15 border-2 border-brand/40':'bg-white/4 border border-white/8'}`}>
              {p.featured&&<div className="text-xs font-bold text-brand uppercase tracking-widest mb-3">Mais popular ⭐</div>}
              <div className="text-sm font-bold text-white/40 uppercase tracking-wider mb-2">{p.name}</div>
              <div className="text-4xl font-black text-white tracking-tight mb-1">{p.price}</div>
              <div className="text-sm text-white/30 mb-6">{p.period}</div>
              <div className="border-t border-white/8 pt-5 space-y-3 mb-6">
                {p.features.map((f,i)=>(
                  <div key={i} className={`text-sm flex items-start gap-2 ${f.off?'text-white/20':'text-white/55'}`}>
                    <span className={f.off?'text-white/15':'text-green'}>{f.off?'—':'✓'}</span>
                    {f.label}
                  </div>
                ))}
              </div>
              <Link href="/auth/register" className={`block text-center font-bold py-3 rounded-xl transition-opacity hover:opacity-90 ${p.featured?'bg-brand text-white':'bg-white/8 text-white'}`}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-8 pb-28 text-center">
        <div className="bg-brand/10 border border-brand/20 rounded-3xl p-14">
          <h2 className="text-4xl font-black mb-4">Comece agora, é grátis</h2>
          <p className="text-white/40 mb-8 text-lg">Sem cartão de crédito. Sem pegadinhas.</p>
          <Link href="/auth/register" className="inline-block bg-brand text-white font-bold text-lg px-10 py-4 rounded-2xl hover:opacity-90 transition-all hover:scale-105">
            Criar minha conta →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/8 py-10 text-center">
        <p className="text-sm text-white/25">
          <strong className="text-white/40">WalletIQ</strong> · Saúde Financeira Pessoal · 2025
        </p>
        <p className="text-xs text-white/15 mt-2">
          Next.js · Supabase · Pluggy · Claude AI
        </p>
      </footer>

    </div>
  )
}

const FEATURES = [
  { icon:'⏱️', title:'Ticker por Minuto', desc:'Quanto você ganha e gasta a cada minuto — receitas fixas diluídas e variáveis distribuídas nos minutos restantes.' },
  { icon:'📊', title:'Acumulação Inteligente', desc:'Dia zera meia-noite. Semana zera segunda. Mês zera dia 1°. Ano acumula tudo. Cada janela com seu próprio ritmo.' },
  { icon:'🏦', title:'Open Finance Real', desc:'Conecte Nubank, Itaú, Bradesco, Inter, XP, BB, C6 e Caixa. Transações importadas e classificadas automaticamente.' },
  { icon:'🤖', title:'Consultor IA', desc:'Claude com acesso ao seu contexto financeiro real. Dicas de investimento, análise de gastos e estratégias personalizadas.' },
  { icon:'📰', title:'Mercado ao Vivo', desc:'USD, EUR, BTC, GBP, ARS e CNY atualizados a cada 5 minutos. Notícias de Selic, Ibovespa, IPCA e PIB.' },
  { icon:'📅', title:'Visão Anual', desc:'Projeção 12 meses com gráfico de barras, tabela mês a mês e taxa de poupança anual projetada.' },
]

const PLANS = [
  {
    name:'Free', price:'R$ 0', period:'para sempre', featured:false, cta:'Começar grátis',
    features:[
      {label:'1 banco conectado'},{label:'Ticker por minuto'},{label:'Câmbio e notícias'},
      {label:'5 mensagens IA / dia'},
      {label:'Histórico 12 meses',off:true},{label:'Relatórios PDF',off:true},
    ]
  },
  {
    name:'Pro', price:'R$ 19,90', period:'/mês · cancele quando quiser', featured:true, cta:'Assinar Pro',
    features:[
      {label:'Bancos ilimitados'},{label:'Ticker por minuto'},{label:'Câmbio e notícias'},
      {label:'IA ilimitada'},{label:'Histórico 12 meses'},{label:'Relatórios PDF'},
    ]
  },
  {
    name:'Premium', price:'R$ 39,90', period:'/mês · família inclusa', featured:false, cta:'Assinar Premium',
    features:[
      {label:'Tudo do Pro'},{label:'5 membros da família'},{label:'Histórico 36 meses'},
      {label:'Suporte dedicado'},{label:'Relatório IR (em breve)'},{label:'Apple Watch (em breve)'},
    ]
  },
]
