import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function POST(req: Request) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { goal_name, goal_category, target_amount, deadline, available_monthly, monthly_income, has_debt, total_debt } = body

  const months_left = deadline
    ? Math.max(1, Math.ceil((new Date(deadline).getTime() - Date.now()) / (30 * 86400000)))
    : 24
  const suggested_monthly = Math.ceil(target_amount / months_left)
  const feasibility_pct = available_monthly > 0 ? Math.round((suggested_monthly / available_monthly) * 100) : 0

  const prompt = `Você é um CFO pessoal especializado em finanças brasileiras. Analise a meta e forneça estratégia personalizada em português.

META: "${goal_name}" | Categoria: ${goal_category}
Valor alvo: R$ ${Number(target_amount).toFixed(2)}
Prazo: ${months_left} meses${deadline ? ` (${new Date(deadline).toLocaleDateString('pt-BR')})` : ' (sem prazo)'}
Contribuição necessária: R$ ${suggested_monthly}/mês
Disponível por mês: R$ ${Number(available_monthly).toFixed(2)} (${feasibility_pct}% comprometido com esta meta)
Renda mensal: R$ ${Number(monthly_income).toFixed(2)}
Possui dívidas: ${has_debt ? `Sim — R$ ${Number(total_debt || 0).toFixed(2)} total` : 'Não'}

Responda APENAS com JSON válido neste formato exato:
{
  "viability": "análise de 1-2 frases sobre se a meta é viável",
  "strategy": ["passo concreto 1", "passo concreto 2", "passo concreto 3"],
  "tips": ["dica específica para ${goal_category} 1", "dica específica 2"],
  "alerts": ["alerta se necessário — array vazio se não houver"],
  "adjustment": "sugestão de ajuste de prazo/valor se inviável, null se viável"
}`

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 700,
        response_format: { type: 'json_object' },
      }),
    })

    if (!groqRes.ok) throw new Error(`Groq ${groqRes.status}`)
    const groqData = await groqRes.json()
    const content = JSON.parse(groqData.choices[0].message.content)
    return NextResponse.json({ consultation: content, suggested_monthly, months_left, feasibility_pct })
  } catch {
    const fallback = buildFallback(
      goal_category, Number(target_amount), suggested_monthly,
      Number(available_monthly), months_left, has_debt, Number(total_debt || 0)
    )
    return NextResponse.json({ consultation: fallback, suggested_monthly, months_left, feasibility_pct })
  }
}

const CATEGORY_TIPS: Record<string, string[]> = {
  emergencia:    ['Mantenha em Tesouro Selic ou CDB com liquidez diária', 'Meta ideal: 3 a 6 meses de despesas essenciais'],
  viagem:        ['Pesquise passagens com 3-6 meses de antecedência', 'Milhas de cartão de crédito podem cobrir parte do custo'],
  imovel:        ['Entrada mínima recomendada: 20% do valor do imóvel', 'Analise programas habitacionais como MCMV e FGTS'],
  veiculo:       ['Some seguro, IPVA e manutenção ao custo total', 'Financiamentos ideais: até 36 meses com entrada ≥ 30%'],
  aposentadoria: ['Quanto mais cedo começar, menor o esforço mensal', 'Avalie PGBL (dedutor no IR) ou VGBL conforme seu perfil'],
  educacao:      ['Busque bolsas, ProUni ou FIES antes de pagar integral', 'Cursos online complementam formação a custo reduzido'],
  saude:         ['Plano de saúde individual ou PME pode ser mais barato', 'Reserve parte em conta separada para imprevistos médicos'],
  outro:         ['Automatize a transferência logo no início do mês', 'Revise e ajuste o valor a cada trimestre conforme sua renda'],
}

function buildFallback(
  category: string, target: number, monthly: number,
  available: number, months: number, has_debt: boolean, total_debt: number
) {
  const feasible = monthly <= available * 0.6
  const pct = available > 0 ? Math.round((monthly / available) * 100) : 0
  const altMonths = available > 0 ? Math.ceil(target / (available * 0.4)) : months * 2
  const altMonthly = Math.ceil(target / altMonths)
  const tips = CATEGORY_TIPS[category] ?? CATEGORY_TIPS.outro

  return {
    viability: feasible
      ? `Meta viável! Você precisaria de R$ ${monthly.toFixed(0)}/mês (${pct}% do seu disponível) para alcançar o objetivo em ${months} meses.`
      : `Desafiadora: R$ ${monthly.toFixed(0)}/mês necessários vs. R$ ${available.toFixed(0)} disponível (${pct}%). Considere estender o prazo.`,
    strategy: [
      `Automatize uma transferência de R$ ${Math.min(monthly, Math.round(available * 0.4)).toFixed(0)} todo dia 1° para uma conta separada`,
      has_debt && total_debt > available * 6
        ? `Priorize quitar dívidas de alto juro (cartão/cheque especial) antes de intensificar esta meta`
        : `Invista os valores em Tesouro Selic ou CDB com liquidez diária enquanto acumula`,
      feasible
        ? `Acompanhe o progresso mensalmente e celebre cada 25% atingido para manter o foco`
        : `Para viabilizar sem apertar o orçamento, estenda o prazo para ${altMonths} meses com R$ ${altMonthly}/mês`,
    ],
    tips,
    alerts: [
      ...(pct > 70 ? [`Esta meta comprometeria ${pct}% do seu disponível — deixe margem para imprevistos`] : []),
      ...(!feasible ? [`Com o prazo atual, seria necessário cortar gastos variáveis significativamente`] : []),
    ],
    adjustment: !feasible
      ? `Em ${altMonths} meses, a contribuição cai para R$ ${altMonthly}/mês — muito mais sustentável com seu orçamento atual.`
      : null,
  }
}
