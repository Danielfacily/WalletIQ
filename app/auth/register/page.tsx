'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [done, setDone]       = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } }
    })
    if (error) { setError(error.message); setLoading(false) }
    else setDone(true)
  }

  if (done) return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">✉️</div>
        <h2 className="text-2xl font-bold text-ink mb-2">Confirme seu e-mail</h2>
        <p className="text-muted text-sm mb-6">Enviamos um link de confirmação para <strong>{email}</strong>. Clique no link para ativar sua conta.</p>
        <Link href="/auth/login" className="btn-primary inline-block">Ir para login</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl font-black text-ink tracking-tight mb-1">Wallet<span className="text-brand">IQ</span></div>
          <p className="text-sm text-muted">Crie sua conta grátis</p>
        </div>
        <div className="card card-pad">
          <h1 className="text-xl font-bold text-ink mb-6">Criar conta</h1>
          {error && <div className="bg-red/10 text-red text-sm font-medium px-4 py-3 rounded-xl mb-4">{error}</div>}
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="label-sm block mb-1.5">Nome</label>
              <input value={name} onChange={e=>setName(e.target.value)} required
                className="w-full bg-surface border border-gray-200 rounded-xl px-4 py-3 text-ink text-sm outline-none focus:border-brand transition-colors"
                placeholder="Seu nome"/>
            </div>
            <div>
              <label className="label-sm block mb-1.5">E-mail</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                className="w-full bg-surface border border-gray-200 rounded-xl px-4 py-3 text-ink text-sm outline-none focus:border-brand transition-colors"
                placeholder="seu@email.com"/>
            </div>
            <div>
              <label className="label-sm block mb-1.5">Senha</label>
              <input type="password" value={password} onChange={e=>setPass(e.target.value)} required minLength={6}
                className="w-full bg-surface border border-gray-200 rounded-xl px-4 py-3 text-ink text-sm outline-none focus:border-brand transition-colors"
                placeholder="Mínimo 6 caracteres"/>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-brand text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? 'Criando conta...' : 'Criar conta grátis'}
            </button>
          </form>
          <p className="text-xs text-muted text-center mt-4">
            Ao criar uma conta você concorda com os{' '}
            <span className="text-brand cursor-pointer">Termos de Uso</span>
          </p>
        </div>
        <p className="text-center text-sm text-muted mt-5">
          Já tem conta?{' '}
          <Link href="/auth/login" className="text-brand font-semibold hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
