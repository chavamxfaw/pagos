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

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
    }
    if (event.type === 'checkout.session.expired') {
      await markCheckoutSession(event.data.object as Stripe.Checkout.Session, 'expired')
    }
  } catch {
    // Never acknowledge an unrecorded payment: Stripe must retry and reconciliation must remain possible.
    console.error('Stripe event could not be reconciled', { eventId: event.id })
    return NextResponse.json({ error: 'Reconciliation pending' }, { status: 500 })
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
  if (session.payment_status !== 'paid') return

  const admin = createAdminClient()
  const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null
  const { data: result, error } = await admin.rpc('complete_stripe_checkout', {
    p_session: session.id,
    p_intent: paymentIntent,
    p_total: typeof session.amount_total === 'number' ? session.amount_total / 100 : null,
    p_currency: session.currency?.toLowerCase() ?? null,
    p_paid_at: getTodayDateString(),
  })
  if (error) throw new Error('Stripe transaction failed')
  if (!result?.payment) return
  const { payment, checkout } = result

  if (!result.replayed) await logActivity(admin, {
    entity_type: 'payment',
    entity_id: payment.id,
    client_id: checkout.client_id,
    order_id: checkout.order_id,
    payment_id: payment.id,
    event_type: 'stripe_payment_succeeded',
    message: `Pago con tarjeta confirmado: ${formatCurrency(checkout.amount)}`,
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
    if (!result.replayed) await notifyAdminStripePayment({ admin, order: updatedOrder, payment, checkout })
  }

  revalidatePath(`/admin/orders/${checkout.order_id}`)
  revalidatePath(`/admin/clients/${checkout.client_id}`)
  revalidatePath('/admin/orders')
  revalidatePath('/admin')
}

async function markCheckoutSession(session: Stripe.Checkout.Session, status: 'expired' | 'cancelled') {
  const admin = createAdminClient()
  const { error } = await admin
    .from('stripe_checkout_sessions')
    .update({ status })
    .eq('stripe_session_id', session.id)
    .eq('status', 'pending')
  if (error) throw new Error('Checkout expiration pending')
  // Session expiry does not cancel the payment request: a newer session may already exist.
}
