import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceIpRateLimit } from '@/lib/security/rate-limit'
import { calculateStripeChargeAmount, getStripeSettings, roundMoney } from '@/lib/stripe/config'
import { getStripeClient } from '@/lib/stripe/client'
import type Stripe from 'stripe'
import { canRetryCreation, checkoutDisposition, reconciliationMessage } from '@/lib/stripe/checkout-state'
import { readLimitedText } from '@/lib/security/request-body'

type CheckoutRequest = {
  orderId?: string
  token?: string
  amount?: number
  paymentRequestId?: string
}

export async function POST(request: Request) {
  const rateLimitResponse = await enforceIpRateLimit({
    request,
    scope: 'stripe_checkout',
    limit: 20,
    windowSeconds: 300,
    blockSeconds: 900,
    failClosed: true,
  })

  if (rateLimitResponse) return rateLimitResponse

  let body: CheckoutRequest
  try {
    const parsed: unknown = JSON.parse(await readLimitedText(request))
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid request')
    const value = parsed as Record<string, unknown>
    if (typeof value.orderId !== 'string' || !uuid.test(value.orderId)
      || typeof value.paymentRequestId !== 'string' || !uuid.test(value.paymentRequestId)
      || typeof value.token !== 'string' || !value.token.trim() || value.token.length > 200
      || (value.amount !== undefined && (typeof value.amount !== 'number' || !Number.isFinite(value.amount) || value.amount <= 0))) {
      throw new Error('Invalid request')
    }
    body = value as CheckoutRequest
  } catch (error) {
    const oversized = error instanceof Error && error.message === 'Solicitud demasiado grande'
    return NextResponse.json({ error: oversized ? 'Solicitud demasiado grande.' : 'Solicitud de pago no válida.' }, { status: oversized ? 413 : 400 })
  }
  const admin = createAdminClient()
  const settings = await getStripeSettings()

  if (!settings.enabled) {
    return NextResponse.json({ error: 'Los pagos con tarjeta no están habilitados.' }, { status: 400 })
  }

  const { data: order, error } = await admin
    .from('orders')
    .select('*, clients(*)')
    .eq('id', body.orderId ?? '')
    .eq('token', body.token ?? '')
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Orden no encontrada.' }, { status: 404 })
  }

  if (order.status === 'cancelled') {
    return NextResponse.json({ error: 'Esta orden está cancelada.' }, { status: 409 })
  }
  if (order.status === 'completed' || order.paid_amount >= order.total_amount) {
    return NextResponse.json({ error: 'Esta orden ya está liquidada.' }, { status: 400 })
  }

  const pendingAmount = roundMoney(Math.max(0, order.total_amount - order.paid_amount))
  const paymentRequest = body.paymentRequestId
    ? await getPendingStripePaymentRequest(admin, body.paymentRequestId, order.id)
    : null

  if (!paymentRequest) {
    return NextResponse.json({ error: 'Solicitud de pago no encontrada o no vigente.' }, { status: 404 })
  }

  const isOpenRequest = paymentRequest.request_type === 'open'
  const requestedAmount = roundMoney(Number(isOpenRequest ? body.amount : paymentRequest.amount))

  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
    return NextResponse.json({ error: 'El monto no es válido.' }, { status: 400 })
  }

  if (isOpenRequest) {
    const minimumAmount = Math.min(
      pendingAmount,
      Math.max(1, Number(paymentRequest.minimum_amount ?? settings.minimum_payment_amount))
    )

    if (requestedAmount < minimumAmount) {
      return NextResponse.json({ error: `El abono mínimo es ${minimumAmount.toFixed(2)} MXN.` }, { status: 400 })
    }
  }

  if (requestedAmount > pendingAmount) {
    return NextResponse.json({ error: 'El monto no puede ser mayor al saldo pendiente.' }, { status: 400 })
  }

  const charge = calculateStripeChargeAmount(requestedAmount, {
    ...settings,
    commission_payer: paymentRequest.commission_payer,
  })
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin
  let stripe

  try {
    stripe = getStripeClient(settings.mode)
  } catch {
    return NextResponse.json({ error: 'Stripe no está configurado en variables de entorno.' }, { status: 500 })
  }

  const parameters: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: order.clients?.email ?? undefined,
    client_reference_id: order.id,
    line_items: [
      {
        price_data: {
          currency: 'mxn',
          product_data: {
            name: order.concept,
            description: `Pago OTLA para ${order.clients?.name ?? 'cliente'}`,
          },
          unit_amount: Math.round(charge.totalCharged * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      order_id: order.id,
      client_id: order.client_id,
      token: order.token,
      payment_amount: String(charge.paymentAmount),
      fee_amount: String(charge.feeAmount),
      total_charged: String(charge.totalCharged),
      commission_payer: paymentRequest.commission_payer,
      payment_request_id: paymentRequest.id,
      checkout_source: isOpenRequest ? 'open_request' : 'fixed_request',
    },
    success_url: `${appUrl}/p/${order.token}?stripe=success`,
    cancel_url: `${appUrl}/p/${order.token}?stripe=cancelled`,
  }

  try {
    const { data: checkout, error: reserveError } = await admin.rpc('reserve_stripe_checkout', {
      p_order: order.id,
      p_request: paymentRequest.id,
      p_amount: charge.paymentAmount,
      p_fee: charge.feeAmount,
      p_total: charge.totalCharged,
      p_metadata: {
        absorbed_fee: charge.absorbedFee,
        mode: settings.mode,
        checkout_source: isOpenRequest ? 'open_request' : 'fixed_request',
        create_params: parameters,
      },
    })
    if (reserveError || !checkout || checkout.status !== 'pending') throw new Error('Checkout unavailable')
    // Preserve the provider account/mode and exact parameters across concurrent retries.
    if (checkout.metadata?.mode && checkout.metadata.mode !== settings.mode) throw new Error('Checkout mode changed')
    let session: Stripe.Checkout.Session
    if (checkout.stripe_session_id.startsWith('creating:')) {
      if (!canRetryCreation(checkout.created_at) || !checkout.metadata?.create_params) throw new Error('Creation needs reconciliation')
      session = await stripe.checkout.sessions.create(checkout.metadata.create_params, {
        idempotencyKey: `checkout:${checkout.id}`,
      })
      const { error: attachError } = await admin.from('stripe_checkout_sessions')
        .update({ stripe_session_id: session.id }).eq('id', checkout.id)
        .eq('stripe_session_id', checkout.stripe_session_id).eq('status', 'pending')
      if (attachError) throw new Error('Checkout attachment pending')
      // Another request or webhook may complete the session while attachment was in flight.
      session = await stripe.checkout.sessions.retrieve(session.id)
    } else {
      session = await stripe.checkout.sessions.retrieve(checkout.stripe_session_id)
    }
    const disposition = checkoutDisposition(session)
    if (disposition === 'reuse') return NextResponse.json({ url: session.url })
    if (disposition === 'expired') {
      const { error: expireError } = await admin.from('stripe_checkout_sessions').update({ status: 'expired' })
        .eq('id', checkout.id).eq('status', 'pending')
      if (expireError) throw new Error('Expiration pending')
      return NextResponse.json({ error: 'La sesión venció. Vuelve a abrir el pago.' }, { status: 409 })
    }
    // Complete is NOT paid in our ledger until the webhook transaction commits.
    return NextResponse.json({ error: reconciliationMessage }, { status: 409 })
  } catch {
    return NextResponse.json({ error: reconciliationMessage }, { status: 409 })
  }
}

async function getPendingStripePaymentRequest(
  admin: ReturnType<typeof createAdminClient>,
  paymentRequestId: string,
  orderId: string
) {
  const { data, error } = await admin
    .from('stripe_payment_requests')
    .select('*')
    .eq('id', paymentRequestId)
    .eq('order_id', orderId)
    .eq('status', 'pending')
    .single()

  if (error || !data) return null
  return data
}
