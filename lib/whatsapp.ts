// Evolution API client — send WhatsApp messages via REST
const BASE_URL  = process.env.EVOLUTION_API_URL  ?? ''
const API_KEY   = process.env.EVOLUTION_API_KEY   ?? ''
const INSTANCE  = process.env.EVOLUTION_INSTANCE  ?? ''

export interface WaSendResult { success: boolean; error?: string }

export async function waSendText(phone: string, text: string): Promise<WaSendResult> {
  if (!BASE_URL || !API_KEY || !INSTANCE) {
    console.warn('[whatsapp] Evolution API not configured — skipping send')
    return { success: false, error: 'not_configured' }
  }

  try {
    const res = await fetch(`${BASE_URL}/message/sendText/${INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: API_KEY,
      },
      body: JSON.stringify({
        number: phone.replace(/\D/g, ''),
        textMessage: { text },
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error('[whatsapp] send failed', res.status, body)
      return { success: false, error: `http_${res.status}` }
    }
    return { success: true }
  } catch (err: any) {
    console.error('[whatsapp] send error', err)
    return { success: false, error: err?.message ?? 'unknown' }
  }
}

// ── Natural language expense parser ────────────────────────────────────────

export interface ParsedTransaction {
  type: 'income' | 'expense'
  amount: number
  name: string
  category: string
}

const CATEGORY_PATTERNS: [RegExp, string][] = [
  [/uber|99|taxi|ônibus|metro|metrô|gasolina|combustível|estacionamento|pedágio/i, 'transport'],
  [/mercado|supermercado|ifood|rappi|restaurante|lanche|almoço|jantar|café|padaria|pizza/i, 'food'],
  [/aluguel|condomínio|luz|energia|água|gás|internet|telefone/i, 'housing'],
  [/farmácia|médico|hospital|plano de saúde|dentista|academia/i, 'health'],
  [/netflix|spotify|amazon|prime|disney|globo|youtube|assinatura/i, 'subscription'],
  [/faculdade|curso|escola|livro|material/i, 'education'],
  [/cinema|teatro|show|festa|bar|viagem|hotel/i, 'leisure'],
]

function guessCategory(name: string): string {
  for (const [re, cat] of CATEGORY_PATTERNS) {
    if (re.test(name)) return cat
  }
  return 'other_ex'
}

// Patterns: "gastei 50 no almoço", "recebi 200 de freelance", "paguei 120 na academia"
export function parseWaMessage(text: string): ParsedTransaction | null {
  const t = text.trim().toLowerCase()

  // Amount extraction — matches "50", "50,00", "R$50", "50.00"
  const amountMatch = t.match(/r?\$?\s*([\d.,]+)/)
  if (!amountMatch) return null
  const raw = amountMatch[1].replace(/\.(?=\d{3})/g, '').replace(',', '.')
  const amount = parseFloat(raw)
  if (isNaN(amount) || amount <= 0) return null

  // Type detection
  const isIncome = /recebi|salário|freelance|renda|ganho|entrou|depósito/.test(t)
  const type: 'income' | 'expense' = isIncome ? 'income' : 'expense'

  // Description extraction — take everything after the amount
  const afterAmount = text.slice(text.search(/[\d.,]+/) + amountMatch[1].length).trim()
  const name = afterAmount
    .replace(/^(no|na|em|de|do|da|pra|para|com)\s+/i, '')
    .replace(/[^a-zA-ZÀ-ÿ0-9 ]/g, ' ')
    .trim()
    .slice(0, 60) || (isIncome ? 'Receita' : 'Gasto')

  const category = isIncome ? 'other_in' : guessCategory(name || text)

  return { type, amount, name, category }
}
