"use server"

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'
import { getTodayDateString } from '@/lib/utils'
import type { OrderStatus } from '@/types'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')
  return user
}

export async function createOrder(data: {
  client_id: string
  concept: string
  description?: string
  amount: number
  requires_invoice?: boolean
  tax_mode?: 'included' | 'added'
  issued_at?: string
  due_date?: string
}) {
  await requireAuth()
  const admin = createAdminClient()
  const amounts = calculateOrderAmounts({
    amount: data.amount,
    requiresInvoice: data.requires_invoice ?? false,
    taxMode: data.tax_mode,
  })

  const { data: order, error } = await admin
    .from('orders')
    .insert({
      client_id: data.client_id,
      concept: data.concept,
      description: data.description,
      issued_at: data.issued_at || getTodayDateString(),
      due_date: data.due_date || null,
      ...amounts,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  await logActivity(admin, {
    entity_type: 'order',
    entity_id: order.id,
    client_id: data.client_id,
    order_id: order.id,
    event_type: 'order_created',
    message: `Orden creada: ${data.concept}`,
    metadata: { total_amount: amounts.total_amount },
  })
  revalidatePath('/admin/orders')
  revalidatePath(`/admin/clients/${data.client_id}`)
  return order
}

export async function updateOrder(orderId: string, data: {
  client_id: string
  concept: string
  description?: string
  amount: number
  requires_invoice?: boolean
  tax_mode?: 'included' | 'added'
  issued_at?: string
  due_date?: string
  status?: OrderStatus
}) {
  await requireAuth()
  const admin = createAdminClient()

  const { data: currentOrder, error: fetchError } = await admin
    .from('orders')
    .select('client_id, paid_amount, completed_at, status')
    .eq('id', orderId)
    .single()

  if (fetchError || !currentOrder) {
    throw new Error(fetchError?.message ?? 'Orden no encontrada')
  }

  const amounts = calculateOrderAmounts({
    amount: data.amount,
    requiresInvoice: data.requires_invoice ?? false,
    taxMode: data.tax_mode,
  })

  if (amounts.total_amount < currentOrder.paid_amount) {
    throw new Error('El nuevo total no puede ser menor a lo ya pagado. Ajusta el monto para cubrir los abonos registrados.')
  }

  const status = getEditableStatus(data.status, currentOrder.paid_amount, amounts.total_amount)
  const completedAt = status === 'completed'
    ? currentOrder.completed_at ?? new Date().toISOString()
    : null
  const cancelledAt = status === 'cancelled'
    ? new Date().toISOString()
    : null

  const { data: order, error } = await admin
    .from('orders')
    .update({
      client_id: data.client_id,
      concept: data.concept,
      description: data.description,
      issued_at: data.issued_at || getTodayDateString(),
      due_date: data.due_date || null,
      ...amounts,
      status,
      completed_at: completedAt,
      cancelled_at: cancelledAt,
    })
    .eq('id', orderId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  await logActivity(admin, {
    entity_type: 'order',
    entity_id: orderId,
    client_id: data.client_id,
    order_id: orderId,
    event_type: 'order_updated',
    message: `Orden actualizada: ${data.concept}`,
    metadata: { total_amount: amounts.total_amount, status },
  })

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath(`/admin/clients/${currentOrder.client_id}`)
  revalidatePath(`/admin/clients/${data.client_id}`)
  revalidatePath('/admin')
  return order
}

function calculateOrderAmounts({
  amount,
  requiresInvoice,
  taxMode,
}: {
  amount: number
  requiresInvoice: boolean
  taxMode?: 'included' | 'added'
}) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('El monto debe ser mayor a 0')
  }

  if (!requiresInvoice) {
    return {
      total_amount: roundMoney(amount),
      requires_invoice: false,
      tax_mode: 'none',
      subtotal_amount: roundMoney(amount),
      tax_amount: 0,
      tax_rate: 0,
    }
  }

  const rate = 0.16
  if (taxMode === 'included') {
    const subtotal = amount / (1 + rate)
    const tax = amount - subtotal
    return {
      total_amount: roundMoney(amount),
      requires_invoice: true,
      tax_mode: 'included',
      subtotal_amount: roundMoney(subtotal),
      tax_amount: roundMoney(tax),
      tax_rate: rate,
    }
  }

  const subtotal = amount
  const tax = subtotal * rate
  return {
    total_amount: roundMoney(subtotal + tax),
    requires_invoice: true,
    tax_mode: 'added',
    subtotal_amount: roundMoney(subtotal),
    tax_amount: roundMoney(tax),
    tax_rate: rate,
  }
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function getOrderStatus(paidAmount: number, totalAmount: number) {
  if (paidAmount >= totalAmount) return 'completed'
  if (paidAmount > 0) return 'partial'
  return 'pending'
}

function getEditableStatus(status: OrderStatus | undefined, paidAmount: number, totalAmount: number) {
  if (status && ['cancelled', 'paused', 'disputed'].includes(status)) return status
  return getOrderStatus(paidAmount, totalAmount)
}

export async function markOrderCompleted(orderId: string) {
  await requireAuth()
  const admin = createAdminClient()

  const { error } = await admin
    .from('orders')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', orderId)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath('/admin/orders')
  revalidatePath('/admin')
}

export async function deleteOrder(orderId: string, clientId: string) {
  await requireAuth()
  const admin = createAdminClient()

  const { error } = await admin
    .from('orders')
    .delete()
    .eq('id', orderId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/orders')
  revalidatePath(`/admin/clients/${clientId}`)
  revalidatePath('/admin')
}
