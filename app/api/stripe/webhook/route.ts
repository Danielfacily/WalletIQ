import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Use service role for webhook (no user session available)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Map Stripe Price ID → plan name
function priceIdToPlan(priceId: string): string {
  if (priceId === process.env.STRIPE_PRICE_PRO)     return 'pro'
  if (priceId === process.env.STRIPE_PRICE_PREMIUM) return 'premium'
  return 'free'
}

async function updateUserPlan(userId: string, plan: string, expiresAt: Date | null) {
  await supabaseAdmin
    .from('profiles')
    .update({
      plan,
      plan_expires_at: expiresAt?.toISOString() ?? null,
    })
    .eq('id', userId)

  console.log(`[Stripe] Updated user ${userId} to plan: ${plan}`)
}

export async function POST(req: NextRequest) {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('[Stripe Webhook] Invalid signature:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {

      // ── Subscription created / updated ──────────────────
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub    = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.supabase_user_id
        if (!userId) break

        const priceId  = sub.items.data[0]?.price.id
        const plan     = priceIdToPlan(priceId)
        const isActive = ['active','trialing'].includes(sub.status)
        const expires  = isActive ? new Date(sub.current_period_end * 1000) : null

        await updateUserPlan(userId, isActive ? plan : 'free', expires)
        break
      }

      // ── Subscription cancelled / deleted ────────────────
      case 'customer.subscription.deleted': {
        const sub    = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.supabase_user_id
        if (!userId) break
        await updateUserPlan(userId, 'free', null)
        break
      }

      // ── Checkout completed (first payment) ──────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Session
        if (session.mode !== 'subscription') break

        // Get subscription to extract metadata
        const sub    = await stripe.subscriptions.retrieve(session.subscription as string)
        const userId = sub.metadata?.supabase_user_id
        if (!userId) break

        const priceId = sub.items.data[0]?.price.id
        const plan    = priceIdToPlan(priceId)
        const expires = new Date(sub.current_period_end * 1000)
        await updateUserPlan(userId, plan, expires)
        break
      }

      // ── Payment failed ───────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subId   = invoice.subscription as string
        if (!subId) break

        const sub    = await stripe.subscriptions.retrieve(subId)
        const userId = sub.metadata?.supabase_user_id
        if (!userId) break

        // Grace period — don't downgrade immediately, Stripe retries
        console.log(`[Stripe] Payment failed for user ${userId}`)
        break
      }

      default:
        console.log(`[Stripe] Unhandled event: ${event.type}`)
    }
  } catch (err: any) {
    console.error('[Stripe Webhook] Handler error:', err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// Stripe requires raw body — disable Next.js body parsing
export const config = { api: { bodyParser: false } }
