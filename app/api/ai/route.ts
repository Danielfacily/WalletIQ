import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase'
import { guardAI, incrementAIUsage, getUserPlan } from '@/lib/plan-guard'

// Groq — gratuito, sem cartão de crédito
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL   = 'llama-3.1-8b-instant'

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── Plan guard: bloqueia Free após 5 msgs/dia ─────────
  const blocked = await guardAI()
  if (blocked) return blocked

  const { message, context, history = [] } = await req.json()

  const systemPrompt = `Você é o consultor de saúde financeira do WalletIQ.
Use os dados reais do usuário para respostas personalizadas e práticas.
Responda em português brasileiro, máximo 200 palavras, tom profissional e empático.

DADOS FINANCEIROS DO USUÁRIO:
${JSON.stringify(context, null, 2)}`

  try {
    const res = await fetch(GROQ_API_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        max_tokens:  600,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-10).map((h: any) => ({
            role:    h.role === 'ai' ? 'assistant' : 'user',
            content: h.content ?? h.text,
          })),
          { role: 'user', content: message },
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Groq error: ${err}`)
    }

    const data = await res.json()
    const text = data.choices?.[0]?.message?.content ?? 'Não consegui processar. Tente novamente.'

    // Incrementa contador de uso
    await incrementAIUsage(user.id)
    const ctx = await getUserPlan()

    return NextResponse.json({
      reply: text,
      usage: {
        plan:      ctx?.plan ?? 'free',
        msgsToday: (ctx?.aiMsgsToday ?? 0) + 1,
        msgsLimit: ctx?.plan === 'free' ? 5 : 999,
      }
    })
  } catch (e: any) {
    console.error('[AI Route]', e.message)
    return NextResponse.json({ error: 'Erro ao processar. Tente novamente.' }, { status: 500 })
  }
}
