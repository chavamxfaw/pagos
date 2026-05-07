import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripeClient, getStripeWebhookSecrets } from '@/lib/stripe/client'
import { logActivity } from '@/lib/activity'
import { notifyAdminStripePayment } from '@/lib/admin-stripe-notifications'
import { notifyPaymentReceipt } from '@/lib/payments/notifications'
import { formatCurrency, getTodayDateString } from '@/lib/utils'

export async function POST(request: Request) {
  const stripe = getStripeClient()
  const signature = request.headers.get('stripe-signature')

  const webhookSecrets = getStripeWebhookSecrets()

  if (!signature || webhookSecrets.length === 0) {
    return NextResponse.json({ error: 'Missing Stripe webhook configuration' }, { status: 400 })
  }

  const body = await request.text()
  let event: Stripe.Event

  try {
    event = constructStripeEvent(stripe, body, signature, webhookSecrets)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
  }

  if (event.type === 'checkout.session.expired') {
    await markCheckoutSession(event.data.object as Stripe.Checkout.Session, 'expired')
  }

  return NextResponse.json({ received: true })
}

function constructStripeEvent(stripe: Stripe, body: string, signature: string, secrets: string[]) {
  let lastError: unknown

  for (const secret of secrets) {
    try {
      return stripe.webhooks.constructEvent(body, signature, secret)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const admin = createAdminClient()
  const { data: checkout } = await admin
    .from('stripe_checkout_sessions')
    .select('*, orders(*, clients(*))')
    .eq('stripe_session_id', session.id)
    .maybeSingle()

  if (!checkout || checkout.status === 'paid') return

  const initialOrder = Array.isArray(checkout.orders) ? checkout.orders[0] : checkout.orders
  if (!initialOrder) return

  const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null

  const { data: payment, error: paymentError } = await admin
    .from('payments')
    .insert({
      order_id: checkout.order_id,
      amount: checkout.amount,
      concept: 'Pago con tarjeta Stripe',
      payment_method: 'card',
      payment_reference: paymentIntent ?? session.id,
      notes: checkout.fee_amount > 0
        ? `Pago por Stripe. Comisión cargada al cliente: ${formatCurrency(checkout.fee_amount)}.`
        : 'Pago por Stripe.',
      paid_at: getTodayDateString(),
    })
    .select()
    .single()

  if (paymentError) throw new Error(paymentError.message)

  await admin
    .from('stripe_checkout_sessions')
    .update({
      status: 'paid',
      stripe_payment_intent_id: paymentIntent,
      paid_at: new Date().toISOString(),
    })
    .eq('id', checkout.id)

  if (checkout.payment_request_id) {
    await admin
      .from('stripe_payment_requests')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', checkout.payment_request_id)
  }

  await logActivity(admin, {
    entity_type: 'payment',
    entity_id: payment.id,
    client_id: checkout.client_id,
    order_id: checkout.order_id,
      payment_id: payment.id,
      event_type: 'stripe_payment_succeeded',
    message: `Pago con tarjeta confirmado: ${formatCurrency(checkout.amount)} para ${initialOrder.concept}`,
    metadata: {
      stripe_session_id: session.id,
      stripe_payment_intent_id: paymentIntent,
      stripe_payment_request_id: checkout.payment_request_id,
      total_charged: checkout.total_charged,
      fee_amount: checkout.fee_amount,
      commission_payer: checkout.commission_payer,
    },
  })

  const { data: updatedOrder } = await admin
    .from('orders')
    .select('*, clients(*)')
    .eq('id', checkout.order_id)
    .single()

  if (updatedOrder?.clients) {
    await notifyPaymentReceipt({ admin, order: updatedOrder, payment })
    await notifyAdminStripePayment({ admin, order: updatedOrder, payment, checkout })
  }

  revalidatePath(`/admin/orders/${checkout.order_id}`)
  revalidatePath(`/admin/clients/${checkout.client_id}`)
  revalidatePath('/admin/orders')
  revalidatePath('/admin')
}

async function markCheckoutSession(session: Stripe.Checkout.Session, status: 'expired' | 'cancelled') {
  const admin = createAdminClient()
  await admin
    .from('stripe_checkout_sessions')
    .update({ status })
    .eq('stripe_session_id', session.id)
    .eq('status', 'pending')

  const { data: checkout } = await admin
    .from('stripe_checkout_sessions')
    .select('payment_request_id')
    .eq('stripe_session_id', session.id)
    .maybeSingle()

  if (checkout?.payment_request_id) {
    await admin
      .from('stripe_payment_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', checkout.payment_request_id)
      .eq('status', 'pending')
  }
}
