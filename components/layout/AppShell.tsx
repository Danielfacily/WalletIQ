'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const NAV = [
  { href:'/dashboard',   icon:'💚', label:'Saúde'     },
  { href:'/calendar',    icon:'📆', label:'Calendário'},
  { href:'/market',      icon:'📰', label:'Mercado'   },
  { href:'/consultant',  icon:'🤖', label:'Consultor' },
  { href:'/transactions',icon:'➕', label:'Lançar'    },
]

export default function AppShell({ children, user }: { children: React.ReactNode; user?: any }) {
  const path   = usePathname()
  const router = useRouter()

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-surface flex">

      {/* SIDEBAR — desktop */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-gray-100 fixed h-full z-10">
        <div className="p-6 border-b border-gray-100">
          <div className="text-xl font-black text-ink tracking-tight">
            Wallet<span className="text-brand">IQ</span>
          </div>
          <div className="text-xs text-muted mt-1">Saúde Financeira</div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(n=>(
            <Link key={n.href} href={n.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${path===n.href?'bg-brand/10 text-brand':'text-muted hover:bg-surface hover:text-ink'}`}>
              <span className="text-base">{n.icon}</span>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-brand rounded-full flex items-center justify-center text-white text-xs font-bold">
              {user?.full_name?.[0]?.toUpperCase()||'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-ink truncate">{user?.full_name||'Usuário'}</div>
              <div className="text-xs text-muted capitalize">{user?.plan||'free'}</div>
            </div>
          </div>
          {(user?.plan==='free'||!user?.plan)&&(
            <Link href="/upgrade" className="block w-full text-center text-xs font-bold bg-brand/10 text-brand py-2 rounded-xl mb-2 hover:bg-brand/20 transition-colors">
              ⭐ Fazer upgrade → Pro
            </Link>
          )}
          <button onClick={logout} className="w-full text-left text-xs text-muted hover:text-red transition-colors px-1 py-1">
            Sair da conta →
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 lg:ml-60 pb-20 lg:pb-0">
        {children}
      </main>

      {/* BOTTOM NAV — mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 flex justify-around py-2 pb-5 z-20">
        {NAV.map(n=>(
          <Link key={n.href} href={n.href} className="flex flex-col items-center gap-1 px-3 py-1">
            <span className="text-xl">{n.icon}</span>
            <span className={`text-[10px] font-semibold ${path===n.href?'text-brand':'text-muted'}`}>
              {n.label}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
