"use server"

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { calculateStripeChargeAmount, getStripeSettings } from '@/lib/stripe/config'
import { formatCurrency } from '@/lib/utils'
import { logActivity } from '@/lib/activity'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')
}

export async function createStripePaymentRequest(data: {
  order_id: string
  amount: number
  concept?: string
  requires_invoice?: boolean
  tax_mode?: 'none' | 'included' | 'added'
  notes?: string
}) {
  await requireAuth()
  const admin = createAdminClient()
  const settings = await getStripeSettings()

  if (!settings.enabled) {
    throw new Error('Stripe no está habilitado en configuración.')
  }

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('*, clients(*)')
    .eq('id', data.order_id)
    .single()

  if (orderError || !order) {
    throw new Error(orderError?.message ?? 'Orden no encontrada')
  }

  if (order.status === 'completed' || order.paid_amount >= order.total_amount) {
    throw new Error('La orden ya está liquidada.')
  }

  const pendingAmount = Math.max(0, Number(order.total_amount) - Number(order.paid_amount))
  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    throw new Error('El monto debe ser mayor a 0.')
  }
  if (data.amount > pendingAmount) {
    throw new Error('El monto solicitado no puede ser mayor al saldo pendiente.')
  }

  const charge = calculateStripeChargeAmount(data.amount, settings)
  const concept = data.concept?.trim() || `Solicitud de pago - ${order.concept}`
  const taxMode = data.requires_invoice ? (data.tax_mode === 'added' || data.tax_mode === 'included' ? data.tax_mode : 'included') : 'none'

  const { data: request, error } = await admin
    .from('stripe_payment_requests')
    .insert({
      order_id: order.id,
      client_id: order.client_id,
      amount: charge.paymentAmount,
      concept,
      commission_payer: settings.commission_payer,
      fee_amount: charge.feeAmount,
      total_charged: charge.totalCharged,
      requires_invoice: data.requires_invoice ?? false,
      tax_mode: taxMode,
      notes: data.notes || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  await logActivity(admin, {
    entity_type: 'order',
    entity_id: order.id,
    client_id: order.client_id,
    order_id: order.id,
    event_type: 'stripe_payment_request_created',
    message: `Solicitud Stripe creada por ${formatCurrency(charge.paymentAmount)} para ${order.concept}`,
    metadata: {
      stripe_payment_request_id: request.id,
      amount: charge.paymentAmount,
      total_charged: charge.totalCharged,
      fee_amount: charge.feeAmount,
      commission_payer: settings.commission_payer,
    },
  })

  revalidatePath(`/admin/orders/${order.id}`)
  revalidatePath(`/p/${order.token}`)
  revalidatePath(`/c/${order.clients.client_portal_token}`)

  return request
}

export async function cancelStripePaymentRequest(requestId: string) {
  await requireAuth()
  const admin = createAdminClient()

  const { data: request, error: fetchError } = await admin
    .from('stripe_payment_requests')
    .select('*, orders(token, clients(client_portal_token))')
    .eq('id', requestId)
    .single()

  if (fetchError || !request) {
    throw new Error(fetchError?.message ?? 'Solicitud no encontrada')
  }

  if (request.status !== 'pending') {
    throw new Error('Solo puedes cancelar solicitudes pendientes.')
  }

  const { error } = await admin
    .from('stripe_payment_requests')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', requestId)

  if (error) throw new Error(error.message)

  const order = Array.isArray(request.orders) ? request.orders[0] : request.orders
  revalidatePath(`/admin/orders/${request.order_id}`)
  if (order?.token) revalidatePath(`/p/${order.token}`)
  if (order?.clients?.client_portal_token) revalidatePath(`/c/${order.clients.client_portal_token}`)
}
