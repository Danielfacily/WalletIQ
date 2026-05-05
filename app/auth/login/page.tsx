'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` }
    })
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-3xl font-black text-ink tracking-tight mb-1">
            Wallet<span className="text-brand">IQ</span>
          </div>
          <p className="text-sm text-muted">Saúde Financeira Pessoal</p>
        </div>

        <div className="card card-pad">
          <h1 className="text-xl font-bold text-ink mb-6">Entrar na sua conta</h1>

          {error && (
            <div className="bg-red/10 text-red text-sm font-medium px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label-sm block mb-1.5">E-mail</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                className="w-full bg-surface border border-gray-200 rounded-xl px-4 py-3 text-ink text-sm outline-none focus:border-brand transition-colors"
                placeholder="seu@email.com"/>
            </div>
            <div>
              <label className="label-sm block mb-1.5">Senha</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required
                className="w-full bg-surface border border-gray-200 rounded-xl px-4 py-3 text-ink text-sm outline-none focus:border-brand transition-colors"
                placeholder="••••••••"/>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-brand text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-100"/>
            <span className="text-xs text-muted">ou</span>
            <div className="flex-1 h-px bg-gray-100"/>
          </div>

          <button onClick={handleGoogle}
            className="w-full bg-surface border border-gray-200 text-ink font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors text-sm">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Entrar com Google
          </button>
        </div>

        <p className="text-center text-sm text-muted mt-5">
          Não tem conta?{' '}
          <Link href="/auth/register" className="text-brand font-semibold hover:underline">
            Criar conta grátis
          </Link>
        </p>
      </div>
    </div>
  )
}
