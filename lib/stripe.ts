import Stripe from 'stripe'

// ── Stripe client (server-only) ───────────────────────────
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

// ── Plan config ───────────────────────────────────────────
export const PLANS = {
  free: {
    name:        'Free',
    priceId:     null,
    price:       0,
    features: {
      maxBanks:    1,
      aiMsgsPerDay:5,
      historyMonths:1,
      pdfReports:  false,
      familyMembers:0,
    },
  },
  pro: {
    name:        'Pro',
    priceId:     process.env.STRIPE_PRICE_PRO!,
    price:       1990,   // cents → R$ 19,90
    features: {
      maxBanks:    999,
      aiMsgsPerDay:999,
      historyMonths:12,
      pdfReports:  true,
      familyMembers:0,
    },
  },
  premium: {
    name:        'Premium',
    priceId:     process.env.STRIPE_PRICE_PREMIUM!,
    price:       3990,   // cents → R$ 39,90
    features: {
      maxBanks:    999,
      aiMsgsPerDay:999,
      historyMonths:36,
      pdfReports:  true,
      familyMembers:5,
    },
  },
} as const

export type PlanKey = keyof typeof PLANS

// ── Helpers ───────────────────────────────────────────────
export function getPlanFeatures(plan: PlanKey) {
  return PLANS[plan]?.features ?? PLANS.free.features
}

export function canUseBanks(plan: PlanKey, currentBanks: number): boolean {
  return currentBanks < PLANS[plan].features.maxBanks
}

export function canUseAI(plan: PlanKey, msgsToday: number): boolean {
  return msgsToday < PLANS[plan].features.aiMsgsPerDay
}

export function canViewHistory(plan: PlanKey, monthsAgo: number): boolean {
  return monthsAgo <= PLANS[plan].features.historyMonths
}

// ── Format price ──────────────────────────────────────────
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL'
  }).format(cents / 100)
}
