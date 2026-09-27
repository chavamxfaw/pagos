"use server"

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/admin'
import { logActivity } from '@/lib/activity'
import { getTodayDateString } from '@/lib/utils'
import { validateOrderProject } from '@/lib/crm/service'
import { expireOrderCheckouts } from '@/lib/stripe/cancel-order'
import type { OrderCategory, OrderStatus } from '@/types'

async function requireAuth() {
  return requireAdmin()
}

export async function createOrder(data: {
  client_id: string
  crm_project_id?: string | null
  concept: string
  description?: string
  category?: OrderCategory
  tags?: string
  amount: number
  requires_invoice?: boolean
  tax_mode?: 'included' | 'added'
  issued_at?: string
  due_date?: string
  payment_reminder_enabled?: boolean
  payment_reminder_days_before?: number
  notify_email_enabled?: boolean
  notify_whatsapp_enabled?: boolean
  bank_account_id?: string
  public_sort_order?: number
  public_show_fiscal_document?: boolean
  fiscal_document_id?: string
}) {
  const user = await requireAuth()
  const admin = createAdminClient()
  const projectId = await validateOrderProject({ db: admin, ownerId: user.id }, data.crm_project_id, data.client_id)
  const amounts = calculateOrderAmounts({
    amount: data.amount,
    requiresInvoice: data.requires_invoice ?? false,
    taxMode: data.tax_mode,
  })

  const { data: order, error } = await admin
    .from('orders')
    .insert({
      client_id: data.client_id,
      crm_project_id: projectId,
      concept: data.concept,
      description: data.description,
      category: getOrderCategory(data.category),
      tags: parseTags(data.tags),
      issued_at: data.issued_at || getTodayDateString(),
      due_date: data.due_date || null,
      payment_reminder_enabled: Boolean(data.due_date && data.payment_reminder_enabled),
      payment_reminder_days_before: getReminderDaysBefore(data.payment_reminder_days_before),
      payment_reminder_last_sent_on: null,
      notify_email_enabled: data.notify_email_enabled ?? true,
      notify_whatsapp_enabled: data.notify_whatsapp_enabled ?? true,
      bank_account_id: data.bank_account_id || null,
      public_sort_order: getPublicSortOrder(data.public_sort_order),
      public_show_fiscal_document: Boolean(data.public_show_fiscal_document && data.fiscal_document_id),
      fiscal_document_id: data.fiscal_document_id || null,
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
  crm_project_id?: string | null
  concept: string
  description?: string
  category?: OrderCategory
  tags?: string
  amount: number
  requires_invoice?: boolean
  tax_mode?: 'included' | 'added'
  issued_at?: string
  due_date?: string
  payment_reminder_enabled?: boolean
  payment_reminder_days_before?: number
  notify_email_enabled?: boolean
  notify_whatsapp_enabled?: boolean
  bank_account_id?: string
  public_sort_order?: number
  public_show_fiscal_document?: boolean
  fiscal_document_id?: string
  status?: OrderStatus
}) {
  const user = await requireAuth()
  const admin = createAdminClient()

  const { data: currentOrder, error: fetchError } = await admin
    .from('orders')
    .select('client_id, crm_project_id, paid_amount, completed_at, status, due_date, payment_reminder_enabled, payment_reminder_days_before')
    .eq('id', orderId)
    .single()

  if (fetchError || !currentOrder) {
    throw new Error(fetchError?.message ?? 'Orden no encontrada')
  }
  const projectId = await validateOrderProject({ db: admin, ownerId: user.id }, data.crm_project_id === undefined ? currentOrder.crm_project_id : data.crm_project_id, data.client_id)

  const amounts = calculateOrderAmounts({
    amount: data.amount,
    requiresInvoice: data.requires_invoice ?? false,
    taxMode: data.tax_mode,
  })

  if (amounts.total_amount < currentOrder.paid_amount) {
    throw new Error('El nuevo total no puede ser menor a lo ya pagado. Ajusta el monto para cubrir los abonos registrados.')
  }

  const status = getEditableStatus(data.status, currentOrder.paid_amount, amounts.total_amount)
  if (status === 'cancelled' && currentOrder.status !== 'cancelled') {
    await expireOrderCheckouts(admin, orderId)
  }
  const completedAt = status === 'completed'
    ? currentOrder.completed_at ?? new Date().toISOString()
    : null
  const cancelledAt = status === 'cancelled'
    ? new Date().toISOString()
    : null
  const nextDueDate = data.due_date || null
  const nextReminderEnabled = Boolean(nextDueDate && data.payment_reminder_enabled)
  const nextReminderDaysBefore = getReminderDaysBefore(data.payment_reminder_days_before)
  const shouldResetReminderSentOn =
    currentOrder.due_date !== nextDueDate ||
    currentOrder.payment_reminder_enabled !== nextReminderEnabled ||
    currentOrder.payment_reminder_days_before !== nextReminderDaysBefore

  const { data: order, error } = await admin
    .from('orders')
    .update({
      client_id: data.client_id,
      crm_project_id: projectId,
      concept: data.concept,
      description: data.description,
      category: getOrderCategory(data.category),
      tags: parseTags(data.tags),
      issued_at: data.issued_at || getTodayDateString(),
      due_date: nextDueDate,
      payment_reminder_enabled: nextReminderEnabled,
      payment_reminder_days_before: nextReminderDaysBefore,
      ...(shouldResetReminderSentOn ? { payment_reminder_last_sent_on: null } : {}),
      notify_email_enabled: data.notify_email_enabled ?? true,
      notify_whatsapp_enabled: data.notify_whatsapp_enabled ?? true,
      bank_account_id: data.bank_account_id || null,
      public_sort_order: getPublicSortOrder(data.public_sort_order),
      public_show_fiscal_document: Boolean(data.public_show_fiscal_document && data.fiscal_document_id),
      fiscal_document_id: data.fiscal_document_id || null,
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

export async function updateClientOrderSort(clientId: string, orderedOrderIds: string[]) {
  await requireAuth()
  const admin = createAdminClient()
  const cleanOrderIds = Array.from(new Set(orderedOrderIds.filter(Boolean)))

  if (!cleanOrderIds.length) {
    throw new Error('No hay órdenes para ordenar')
  }

  const { data: orders, error: fetchError } = await admin
    .from('orders')
    .select('id, client_id')
    .eq('client_id', clientId)
    .in('id', cleanOrderIds)

  if (fetchError) throw new Error(fetchError.message)

  const foundIds = new Set((orders ?? []).map((order) => order.id))
  if (foundIds.size !== cleanOrderIds.length) {
    throw new Error('No se pudo validar el orden de todas las órdenes')
  }

  const updates = cleanOrderIds.map((orderId, index) =>
    admin
      .from('orders')
      .update({ public_sort_order: (index + 1) * 10 })
      .eq('id', orderId)
      .eq('client_id', clientId)
  )

  const results = await Promise.all(updates)
  const failed = results.find((result) => result.error)
  if (failed?.error) throw new Error(failed.error.message)

  revalidatePath(`/admin/clients/${clientId}`)
  revalidatePath('/admin/orders')
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

function getOrderCategory(category?: OrderCategory) {
  const allowed: OrderCategory[] = ['service', 'product', 'project', 'subscription', 'other']
  return category && allowed.includes(category) ? category : 'service'
}

function parseTags(value?: string) {
  return Array.from(
    new Set(
      (value ?? '')
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 12)
    )
  )
}

function getReminderDaysBefore(value?: number) {
  if (!Number.isFinite(value)) return 1
  return Math.min(30, Math.max(0, Math.trunc(value!)))
}

function getPublicSortOrder(value?: number) {
  if (!Number.isFinite(value)) return 100
  return Math.min(9999, Math.max(0, Math.trunc(value!)))
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
