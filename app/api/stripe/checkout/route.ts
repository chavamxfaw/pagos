import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateStripeChargeAmount, getStripeSettings, roundMoney } from '@/lib/stripe/config'
import { getStripeClient } from '@/lib/stripe/client'

type CheckoutRequest = {
  orderId?: string
  token?: string
  amount?: number
  paymentRequestId?: string
}

export async function POST(request: Request) {
  const body = (await request.json()) as CheckoutRequest
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

  const session = await stripe.checkout.sessions.create({
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
  })

  const { error: insertError } = await admin
    .from('stripe_checkout_sessions')
    .insert({
      order_id: order.id,
      client_id: order.client_id,
      payment_request_id: paymentRequest.id,
      stripe_session_id: session.id,
      amount: charge.paymentAmount,
      fee_amount: charge.feeAmount,
      total_charged: charge.totalCharged,
      commission_payer: paymentRequest.commission_payer,
      status: 'pending',
      metadata: {
        absorbed_fee: charge.absorbedFee,
        mode: settings.mode,
        checkout_source: isOpenRequest ? 'open_request' : 'fixed_request',
      },
    })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ url: session.url })
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
