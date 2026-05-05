import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase'
import { guardAI, incrementAIUsage, getUserPlan } from '@/lib/plan-guard'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL   = 'llama-3.1-8b-instant'

const MAX_MESSAGE_LENGTH = 2000
const MAX_HISTORY_ITEMS  = 10

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const blocked = await guardAI()
  if (blocked) return blocked

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const { message, context, history = [] } = body as Record<string, unknown>

  if (typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'Mensagem inválida' }, { status: 400 })
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: 'Mensagem muito longa' }, { status: 400 })
  }
  if (!Array.isArray(history)) {
    return NextResponse.json({ error: 'Histórico inválido' }, { status: 400 })
  }

  const safeHistory = history.slice(-MAX_HISTORY_ITEMS)

  const systemPrompt = `Você é o consultor de saúde financeira do WalletIQ.
Use os dados reais do usuário para respostas personalizadas e práticas.
Responda em português brasileiro, máximo 200 palavras, tom profissional e empático.

DADOS FINANCEIROS DO USUÁRIO:
${JSON.stringify(context ?? {}, null, 2)}`

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
          ...safeHistory.map((h: any) => ({
            role:    h.role === 'ai' ? 'assistant' : 'user',
            content: String(h.content ?? h.text ?? '').slice(0, MAX_MESSAGE_LENGTH),
          })),
          { role: 'user', content: message.trim() },
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Groq error: ${err}`)
    }

    const data = await res.json()
    const text = data.choices?.[0]?.message?.content ?? 'Não consegui processar. Tente novamente.'

    await incrementAIUsage(user.id)
    const ctx = await getUserPlan()

    return NextResponse.json({
      reply: text,
      usage: {
        plan:      ctx?.plan ?? 'free',
        msgsToday: (ctx?.aiMsgsToday ?? 0) + 1,
        msgsLimit: ctx?.plan === 'free' ? 5 : 999,
      },
    })
  } catch (e: any) {
    console.error('[AI Route]', e.message)
    return NextResponse.json({ error: 'Erro ao processar. Tente novamente.' }, { status: 500 })
  }
}
