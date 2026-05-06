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
  request_type: 'fixed' | 'open'
  amount?: number | null
  minimum_amount?: number | null
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

  const { data: existingRequest } = await admin
    .from('stripe_payment_requests')
    .select('id')
    .eq('order_id', order.id)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle()

  if (existingRequest) {
    throw new Error('Esta orden ya tiene una solicitud Stripe pendiente. Cancélala antes de crear otra.')
  }

  const pendingAmount = Math.max(0, Number(order.total_amount) - Number(order.paid_amount))
  const requestType = data.request_type === 'open' ? 'open' : 'fixed'
  const fixedAmount = Number(data.amount ?? 0)
  const minimumAmount = data.minimum_amount == null ? null : Number(data.minimum_amount)

  if (requestType === 'fixed' && (!Number.isFinite(fixedAmount) || fixedAmount <= 0)) {
    throw new Error('El monto debe ser mayor a 0.')
  }
  if (requestType === 'fixed' && fixedAmount > pendingAmount) {
    throw new Error('El monto solicitado no puede ser mayor al saldo pendiente.')
  }
  if (requestType === 'open' && minimumAmount !== null && (!Number.isFinite(minimumAmount) || minimumAmount < 1)) {
    throw new Error('El mínimo debe ser mayor o igual a 1.')
  }
  if (requestType === 'open' && minimumAmount !== null && minimumAmount > pendingAmount) {
    throw new Error('El mínimo no puede ser mayor al saldo pendiente.')
  }

  const charge = requestType === 'fixed' ? calculateStripeChargeAmount(fixedAmount, settings) : null
  const concept = data.concept?.trim() || `Solicitud de pago - ${order.concept}`
  const taxMode = data.requires_invoice ? (data.tax_mode === 'added' || data.tax_mode === 'included' ? data.tax_mode : 'included') : 'none'

  const { data: request, error } = await admin
    .from('stripe_payment_requests')
    .insert({
      order_id: order.id,
      client_id: order.client_id,
      request_type: requestType,
      amount: charge?.paymentAmount ?? null,
      minimum_amount: requestType === 'open' ? minimumAmount : null,
      concept,
      commission_payer: settings.commission_payer,
      fee_amount: charge?.feeAmount ?? 0,
      total_charged: charge?.totalCharged ?? 0,
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
    message: requestType === 'fixed'
      ? `Solicitud Stripe creada por ${formatCurrency(charge!.paymentAmount)} para ${order.concept}`
      : `Solicitud Stripe abierta creada para ${order.concept}`,
    metadata: {
      stripe_payment_request_id: request.id,
      request_type: requestType,
      amount: charge?.paymentAmount ?? null,
      minimum_amount: requestType === 'open' ? minimumAmount : null,
      total_charged: charge?.totalCharged ?? null,
      fee_amount: charge?.feeAmount ?? null,
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
