import { NextRequest, NextResponse } from 'next/server'
import { stripe, PLANS, type PlanKey } from '@/lib/stripe'
import { createSupabaseServer } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan } = await req.json() as { plan: PlanKey }

  if (!plan || plan === 'free' || !PLANS[plan]?.priceId) {
    return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
  }

  // Check if user already has a Stripe customer ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, email:id')
    .eq('id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id

  // Create Stripe customer if doesn't exist
  if (!customerId) {
    const customer = await stripe.customers.create({
      email:    user.email!,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id

    // Save customer ID to profile
    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer:             customerId,
    payment_method_types: ['card'],
    line_items: [{
      price:    PLANS[plan].priceId,
      quantity: 1,
    }],
    mode:              'subscription',
    success_url:       `${appUrl}/dashboard?upgrade=success&plan=${plan}`,
    cancel_url:        `${appUrl}/upgrade?canceled=true`,
    subscription_data: {
      metadata: { supabase_user_id: user.id, plan },
    },
    locale:               'pt-BR',
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  })

  return NextResponse.json({ url: session.url })
}
